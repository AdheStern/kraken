// deploy/azure/backup.bicep
// Lo permanente en Azure (AGENTS.md §10 Respaldos y DR): la cuenta de almacenamiento del repo2 de pgBackRest con
// inmutabilidad por versión y el Key Vault que custodia las claves de cifrado y los secretos fuera del host.
//   az deployment group create -g <grupo> -f backup.bicep -p prefix=<prefijo> drAdminsGroupId=<objectId>
// Lo ejecuta DIMANET una vez; la VM de recuperación (dr.bicep) se crea solo en un desastre o un ensayo.

@description('Prefijo corto y único (minúsculas y números) para los nombres globales.')
@maxLength(11)
param prefix string

param location string = resourceGroup().location

@description('Grupo de Entra que administra los secretos de recuperación (DIMANET y DIMASOFT).')
param drAdminsGroupId string

@description('Días que cada versión de un blob queda inmutable. 365 = la retención de completos en repo2.')
param immutabilityDays int = 365

@description('IPs públicas autorizadas (salida de ops-01 y stg-01). Vacío = cualquier origen, solo con SAS.')
param allowedIps array = []

// POR QUÉ: ZRS sobrevive a la caída de una zona sin pagar la geo-réplica; el repo2 ya es la copia fuera del sitio.
param storageSku string = 'Standard_ZRS'

var keyVaultSecretsOfficer = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
var ipRules = [for ip in allowedIps: { value: ip, action: 'Allow' }]

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${prefix}pgbackrest'
  location: location
  sku: { name: storageSku }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    // TRAMPA: un WORM de contenedor (por tiempo) prohíbe reescribir; pgBackRest reescribe backup.info y archive.info
    // y su expire borra. Con WORM por versión, reescribir o borrar deja la versión anterior protegida.
    immutableStorageWithVersioning: {
      enabled: true
      immutabilityPolicy: {
        immutabilityPeriodSinceCreationInDays: immutabilityDays
        // LIMITACIÓN: se bloquea a mano (az storage account blob-service-properties…) tras el primer ensayo;
        // bloqueada ya no se puede acortar ni quitar.
        state: 'Unlocked'
        allowProtectedAppendWrites: false
      }
    }
    networkAcls: empty(allowedIps)
      ? { defaultAction: 'Allow' }
      : {
          defaultAction: 'Deny'
          bypass: 'None'
          ipRules: ipRules
        }
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    isVersioningEnabled: true
    deleteRetentionPolicy: { enabled: true, days: 14 }
    containerDeleteRetentionPolicy: { enabled: true, days: 14 }
  }
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'pgbackrest'
  properties: { publicAccess: 'None' }
}

// POR QUÉ: cada expire y cada reescritura deja una versión anterior; vencida su inmutabilidad, ya no protege nada.
resource lifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'versiones-vencidas'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: ['blockBlob'], prefixMatch: ['pgbackrest/'] }
            actions: {
              version: { delete: { daysAfterCreationGreaterThan: immutabilityDays + 1 } }
            }
          }
        }
      ]
    }
  }
}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kraken-dr'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    // REGLA: sin la clave de cifrado, el repo2 es ilegible; nadie debe poder purgarla (§10).
    enablePurgeProtection: true
  }
}

resource officers 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: vault
  name: guid(vault.id, drAdminsGroupId, keyVaultSecretsOfficer)
  properties: {
    principalId: drAdminsGroupId
    principalType: 'Group'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsOfficer)
  }
}

resource storageLock 'Microsoft.Authorization/locks@2020-05-01' = {
  scope: storage
  name: 'no-borrar-respaldos'
  properties: { level: 'CanNotDelete', notes: 'Repo2 de pgBackRest (AGENTS.md §10).' }
}

resource vaultLock 'Microsoft.Authorization/locks@2020-05-01' = {
  scope: vault
  name: 'no-borrar-secretos'
  properties: { level: 'CanNotDelete', notes: 'Claves de cifrado y secretos de recuperación (AGENTS.md §10).' }
}

output storageAccount string = storage.name
output container string = container.name
output keyVault string = vault.name
