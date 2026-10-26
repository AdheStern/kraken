// deploy/azure/dr.bicep
// VM de recuperación en frío (AGENTS.md §10 DR): un solo nodo con PostgreSQL 16, pgBackRest y Docker, red propia
// y lectura del Key Vault de backup.bicep. Se crea solo ante un desastre o en el ensayo semestral; luego
// scripts/dr-restore.sh restaura el repo2 y levanta la app.
//   az deployment group create -g <grupo> -f dr.bicep -p prefix=<…> keyVaultName=<…> adminCidr=<ip>/32 \
//     sshPublicKey="$(cat ~/.ssh/id_ed25519.pub)"

param prefix string
param location string = resourceGroup().location
param keyVaultName string

@description('Origen autorizado para SSH (la IP pública de quien ejecuta la recuperación).')
param adminCidr string
param adminUsername string = 'kraken'
@secure()
param sshPublicKey string

// POR QUÉ: igual que un nodo de base de producción (§10); la app comparte la VM solo durante el desastre.
param vmSize string = 'Standard_D4s_v5'
param diskSizeGb int = 256

var keyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource nsg 'Microsoft.Network/networkSecurityGroups@2024-01-01' = {
  name: '${prefix}-dr-nsg'
  location: location
  properties: {
    securityRules: [
      {
        name: 'ssh-admin'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: adminCidr
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '22'
        }
      }
      {
        // LIMITACIÓN: sin FortiGate/Radware delante, no hay WAF; HAProxy termina TLS en la VM.
        name: 'https'
        properties: {
          priority: 110
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRanges: ['80', '443']
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-01-01' = {
  name: '${prefix}-dr-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.60.0.0/24'] }
    subnets: [
      {
        name: 'dr'
        properties: { addressPrefix: '10.60.0.0/26', networkSecurityGroup: { id: nsg.id } }
      }
    ]
  }
}

resource ip 'Microsoft.Network/publicIPAddresses@2024-01-01' = {
  name: '${prefix}-dr-ip'
  location: location
  sku: { name: 'Standard' }
  properties: {
    publicIPAllocationMethod: 'Static'
    dnsSettings: { domainNameLabel: '${prefix}-kraken-dr' }
  }
}

resource nic 'Microsoft.Network/networkInterfaces@2024-01-01' = {
  name: '${prefix}-dr-nic'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'ip'
        properties: {
          subnet: { id: vnet.properties.subnets[0].id }
          publicIPAddress: { id: ip.id }
          privateIPAllocationMethod: 'Dynamic'
        }
      }
    ]
  }
}

resource vm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: '${prefix}-kraken-dr'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    hardwareProfile: { vmSize: vmSize }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: 'ubuntu-24_04-lts'
        sku: 'server'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        diskSizeGB: diskSizeGb
        managedDisk: { storageAccountType: 'Premium_LRS' }
      }
    }
    osProfile: {
      computerName: 'kraken-dr'
      adminUsername: adminUsername
      customData: base64(loadTextContent('dr-cloud-init.yaml'))
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [{ path: '/home/${adminUsername}/.ssh/authorized_keys', keyData: sshPublicKey }]
        }
      }
    }
    networkProfile: { networkInterfaces: [{ id: nic.id }] }
  }
}

// REGLA: la VM solo lee secretos (Secrets User); custodiarlos sigue siendo del grupo de recuperación.
resource readSecrets 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: vault
  name: guid(vault.id, vm.id, keyVaultSecretsUser)
  properties: {
    principalId: vm.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUser)
  }
}

output publicIp string = ip.properties.ipAddress
output fqdn string = ip.properties.dnsSettings.fqdn
