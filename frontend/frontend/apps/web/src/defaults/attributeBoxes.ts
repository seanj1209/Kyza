import type { AttributeBoxSpec } from "../types/flowwrap"

export const createEmptyAttributeBoxPreset = (): AttributeBoxSpec[] => []

export const createBarcodeAttributeBoxPreset = (): AttributeBoxSpec[] => [
  {
    id: "attr-barcode",
    kind: "barcode",
    x: 10,
    y: 10,
    width: 25,
    height: 15,
    enabled: false
  }
]

export const createSachetBackAttributeBoxPreset = (): AttributeBoxSpec[] => [
  {
    id: "attr-barcode",
    kind: "barcode",
    laneSide: "B",
    x: 10,
    y: 10,
    width: 25,
    height: 15,
    enabled: false
  },
  {
    id: "attr-qr",
    kind: "qr",
    laneSide: "B",
    x: 10,
    y: 30,
    width: 10,
    height: 10,
    enabled: false
  },
  {
    id: "attr-bbe",
    kind: "bbe",
    laneSide: "B",
    x: 10,
    y: 45,
    width: 25,
    height: 15,
    enabled: false
  }
]

export const createStandardPouchAttributeBoxPreset = (): AttributeBoxSpec[] => [
  {
    id: "attr-barcode",
    kind: "barcode",
    x: 20,
    y: 20,
    width: 25,
    height: 15,
    enabled: false
  },
  {
    id: "attr-qr",
    kind: "qr",
    x: 20,
    y: 40,
    width: 10,
    height: 10,
    enabled: false
  },
  {
    id: "attr-bbe",
    kind: "bbe",
    x: 20,
    y: 55,
    width: 25,
    height: 15,
    enabled: false
  }
]
