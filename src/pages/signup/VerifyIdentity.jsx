// VerifyIdentity — STUB (completed in Build Step 5).
//
// This is the Sumsub handoff: Step 5 embeds the Sumsub sandbox WebSDK in an
// iframe and adds an "I've finished verification" action that sets the account
// to 'pending' and routes into the dashboard. For now it's a placeholder so
// the "Continue verification" path from the check-email screen lands here.
export default function VerifyIdentity() {
  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px] bg-surface-primary border border-border-default rounded-2xl p-6 md:p-8 shadow-sm text-center">
        <h1 className="text-2xl font-medium text-content-primary">Verify your business</h1>
        <p className="text-sm text-content-secondary mt-1.5">
          The Sumsub verification flow will be embedded here.
        </p>
        <p className="text-xs text-content-quaternary mt-6">
          (Step 5 will embed the Sumsub WebSDK + the verification handoff.)
        </p>
      </div>
    </div>
  )
}
