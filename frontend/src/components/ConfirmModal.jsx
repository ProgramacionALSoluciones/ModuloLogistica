const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn border border-gray-100 dark:border-slate-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">{title}</h2>
        <div className="text-gray-600 dark:text-slate-300 mb-6 space-y-2">
          {children}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-primary-500 text-black font-bold rounded-md hover:bg-primary-600 transition shadow-sm"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

