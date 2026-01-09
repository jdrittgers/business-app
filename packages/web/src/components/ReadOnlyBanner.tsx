export default function ReadOnlyBanner() {
  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center">
        <svg className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-blue-700 font-medium">
          View Only - You have employee access. Contact your manager to make changes.
        </p>
      </div>
    </div>
  );
}
