// prisma/seed/bolivia-municipalities.ts
// Departamentos y municipios de Bolivia para ubicar clientes, sucursales y contactos (decisión 2026-11-06).
// Fuente: anexo «Municipios de Bolivia» (340 municipios, INE). Localidades que no son municipio las agrega el
// administrador. POR QUÉ: una cadena por departamento, separada por «|», para que la lista no ocupe 340 líneas.

export const BOLIVIA_DEPARTMENTS: readonly {
  code: string;
  name: string;
  municipalities: string;
}[] = [
  {
    code: "CH",
    name: "Chuquisaca",
    municipalities:
      "Sucre|Yotala|Poroma|Azurduy|Tarvita|Villa Zudáñez|Presto|Villa Mojocoya|Icla|Padilla|Tomina|Sopachuy|Villa Alcalá|El Villar|Monteagudo|Huacareta|Tarabuco|Yamparáez|Camargo|San Lucas|Incahuasi|Villa Charcas|Villa Serrano|Villa Abecia|Culpina|Las Carreras|Villa Vaca Guzmán (Muyupampa)|Huacaya|Macharetí",
  },
  {
    code: "LP",
    name: "La Paz",
    municipalities:
      "La Paz|Palca|Mecapaca|Achocalla|El Alto|Achacachi|Ancoraimes|Chua Cocani|Huarina|Santiago de Huata|Huatajata|Coro Coro|Caquiaviri|Calacoto|Comanche|Charaña|Waldo Ballivián|Nazacara de Pacajes|Callapa|Puerto Acosta|Mocomoco|Puerto Carabuco|Humanata|Escoma|Chuma|Ayata|Aucapata|Sorata|Guanay|Tacacoma|Quiabaya|Combaya|Tipuani|Mapiri|Teoponte|Apolo|Pelechuco|Viacha|Guaqui|Tiahuanaco|Desaguadero|San Andrés de Machaca|Jesús de Machaca|Taraco|Luribay|Sapahaqui|Yaco|Malla|Cairoma|Inquisivi|Quime|Cajuata|Colquiri|Ichoca|Licoma Pampa|Chulumani|Irupana|Yanacachi|Palos Blancos|La Asunta|Pucarani|Laja|Batallas|Puerto Pérez|Sica Sica|Umala|Ayo Ayo|Calamarca|Patacamaya|Colquencha|Collana|Coroico|Coripata|Ixiamas|San Buenaventura|Charazani|Curva|Copacabana|San Pedro de Tiquina|Tito Yupanqui|San Pedro de Curahuara|Papel Pampa|Chacarilla|Santiago de Machaca|Catacora|Caranavi|Alto Beni",
  },
  {
    code: "CB",
    name: "Cochabamba",
    municipalities:
      "Cochabamba|Aiquile|Pasorapa|Omereque|Independencia|Morochata|Cocapata|Tarata|Anzaldo|Arbieto|Sacabamba|Arani|Vacas|Arque|Tacopaya|Capinota|Santiváñez|Sicaya|Cliza|Toco|Tolata|Quillacollo|Sipe Sipe|Tiquipaya|Vinto|Colcapirhua|Sacaba|Colomi|Villa Tunari|Tapacarí|Totora|Pojo|Pocona|Chimoré|Puerto Villarroel|Entre Ríos|Mizque|Vila Vila|Alalay|Punata|Villa Rivero|San Benito|Tacachi|Cuchumuela|Bolívar|Tiraque|Shinahota",
  },
  {
    code: "OR",
    name: "Oruro",
    municipalities:
      "Oruro|Caracollo|El Choro|Paria|Challapata|Santuario de Quillacas|Corque|Choquecota|Curahuara de Carangas|Turco|Huachacalla|Escara|Cruz de Machacamarca|Yunguyo de Litoral|Esmeralda|Poopó|Pazña|Antequera|Huanuni|Machacamarca|Salinas de Garci Mendoza|Pampa Aullagas|Sabaya|Coipasa|Chipaya|Toledo|Eucaliptus|Santiago de Andamarca|Belén de Andamarca|Totora|Santiago de Huari|La Rivera|Todos Santos|Carangas|Huayllamarca",
  },
  {
    code: "PT",
    name: "Potosí",
    municipalities:
      "Potosí|Tinguipaya|Yocalla|Urmiri|Uncía|Chayanta|Llallagua|Chuquihuta|Betanzos|Chaquí|Tacobamba|Colquechaca|Ravelo|Pocoata|Ocurí|San Pedro de Macha|San Pedro de Buena Vista|Toro Toro|Santiago de Cotagaita|Vitichi|Sacaca|Caripuyo|Tupiza|Atocha|Colcha K|San Pedro de Quemes|San Pablo de Lípez|Mojinete|San Antonio de Esmoruco|Puna|Caiza D|Ckochas|Uyuni|Tomave|Porco|Arampampa|Acasio|Llica|Tahua|Villazón|San Agustín",
  },
  {
    code: "TJ",
    name: "Tarija",
    municipalities:
      "Tarija|Padcaya|Bermejo|Yacuiba|Caraparí|Villa Montes|Uriondo|Yunchará|San Lorenzo|El Puente|Entre Ríos",
  },
  {
    code: "SC",
    name: "Santa Cruz",
    municipalities:
      "Santa Cruz de la Sierra|Cotoca|Porongo|La Guardia|El Torno|Warnes|Okinawa Uno|San Ignacio de Velasco|San Miguel de Velasco|San Rafael de Velasco|Buena Vista|San Carlos|Yapacaní|San Juan|San José de Chiquitos|Pailón|Roboré|Portachuelo|Santa Rosa del Sara|Colpa Bélgica|Lagunillas|Charagua|Cabezas|Cuevo|Gutiérrez|Camiri|Boyuibe|Vallegrande|El Trigal|Moro Moro|Postrervalle|Pucará|Samaipata|Pampagrande|Mairana|Quirusillas|Montero|General Saavedra|Mineros|Fernández Alonso|San Pedro|Concepción|San Javier|San Ramón|San Julián|San Antonio de Lomerío|Cuatro Cañadas|San Matías|Comarapa|Saipina|Puerto Suárez|Puerto Quijarro|El Carmen Rivero Tórrez|Ascensión de Guarayos|Urubichá|El Puente",
  },
  {
    code: "BE",
    name: "Beni",
    municipalities:
      "Trinidad|San Javier|Riberalta|Guayaramerín|Reyes|San Borja|Santa Rosa|Rurrenabaque|Santa Ana del Yacuma|Exaltación|San Ignacio de Moxos|Loreto|San Andrés|San Joaquín|San Ramón|Puerto Siles|Magdalena|Baures|Huacaraje",
  },
  {
    code: "PD",
    name: "Pando",
    municipalities:
      "Cobija|Porvenir|Bolpebra|Bella Flor|Puerto Rico|San Pedro|Filadelfia|Puerto Gonzalo Moreno|San Lorenzo|Sena|Santa Rosa del Abuná|Ingavi|Nueva Esperanza|Villa Nueva|Santos Mercado",
  },
];
