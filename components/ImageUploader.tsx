
import React from 'react';

interface Props {
  onUpload: (base64: string) => void;
}

export const ImageUploader: React.FC<Props> = ({ onUpload }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-all">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <i className="fas fa-cloud-upload-alt text-4xl mb-4 text-blue-400"></i>
          <p className="mb-2 text-sm text-slate-300">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500">JPG, PNG, WebP (Max 20MB)</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
        />
      </label>
    </div>
  );
};
