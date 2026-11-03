export const CATALOG_VERSION = "1.0.0";
export const crops = [
  { id: "potato", name: "Papa", scientificName: "Solanum tuberosum L.", family: "Solanaceae", characteristic: "Planta con tubérculos; cultivar no especificado.", reference: "https://powo.science.kew.org/taxon/821337-1", requirements: null },
  { id: "onion", name: "Cebolla", scientificName: "Allium cepa L.", family: "Amaryllidaceae", characteristic: "Cultivar y características agronómicas pendientes de documentación.", reference: "https://mpns.science.kew.org/mpns-portal/plantDetail?dbs=wcs&plantId=295261", requirements: null },
  { id: "carrot", name: "Zanahoria", scientificName: "Daucus carota subsp. sativus", family: "Apiaceae", characteristic: "Forma cultivada por su raíz; cultivar no especificado.", reference: "https://www.kew.org/plants/carrot", requirements: null },
] as const;
export const catalogEvidence = { source: "Royal Botanic Gardens, Kew", accessedAt: "2026-11-02", scope: "Identidad botánica; no valida aptitud local ni umbrales de manejo", version: CATALOG_VERSION };
