import { interpretPackPrompt } from "../interpretPackPrompt"
import { validateAiGeneratedRequest } from "../../safety/validateAiGeneratedRequest"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const run = async () => {
  const doy = await interpretPackPrompt({
    requestId: "ai-test-doy",
    userPrompt: "160 x 220 doy pouch with zip and tear notch"
  })
  assert(doy.success, "Expected DOY prompt to succeed.")
  assert(doy.generatedRequest?.engine === "pack-generator", "Expected pack-generator engine.")
  assert(doy.generatedRequest?.action === "generatePack", "Expected generatePack action.")

  const pillow = await interpretPackPrompt({
    requestId: "ai-test-pillow",
    userPrompt: "make a pillow pack 350 x 220"
  })
  assert(pillow.success, "Expected pillow prompt to succeed.")
  assert(
    (pillow.generatedRequest?.payload as { packType?: string })?.packType === "pillow-pack",
    "Expected pillow-pack payload."
  )

  const unclear = await interpretPackPrompt({
    requestId: "ai-test-unclear",
    userPrompt: "make something nice for snacks"
  })
  assert(!unclear.success, "Expected unclear prompt to fail safely.")
  assert(unclear.errors.length > 0, "Expected structured error for unclear prompt.")

  const rejected = validateAiGeneratedRequest({
    requestId: "ai-test-reject",
    engine: "cutter",
    action: "moveTdEyemarksInward",
    payload: { unsafe: true }
  })
  assert(!rejected.valid, "Expected cutter mutation request to be rejected.")

  console.log("AI engine scaffold checks passed.")
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
