/**
 * Legal Disclaimer Component
 * Mandatory disclaimer displayed on all pages
 */

export default function LegalDisclaimer() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4 rounded-r">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-800">
            <strong className="font-semibold">AVERTISSEMENT LÉGAL:</strong> Les informations fournies par cet assistant sont à titre informatif uniquement
            et ne constituent pas un avis juridique. Pour toute décision importante concernant vos transactions maritimes,
            veuillez consulter un avocat maritime qualifié. Ce service est fourni &quot;tel quel&quot; sans garantie d&apos;exactitude ou d&apos;exhaustivité.
          </p>
        </div>
      </div>
    </div>
  )
}
