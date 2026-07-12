import { useState } from 'react';
import Cropper from 'react-easy-crop';

export default function AvatarCropModal({
  image,
  isSaving,
  onCancel,
  onSave,
  cropShape = 'round',
  title = 'Ajuster la photo',
  saveLabel = 'Enregistrer'
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleSave = () => {
    if (croppedAreaPixels) {
      onSave(croppedAreaPixels);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-t-surface rounded-[32px] shadow-2xl overflow-hidden border border-t-border animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="px-6 py-4 border-b border-t-border">
          <h3 className="text-sm font-black text-t-primary uppercase tracking-widest">{title}</h3>
        </div>
        <div className="relative h-[360px] bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-t-tertiary">Zoom</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-[#3B5FE6]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl bg-t-surface border border-t-border text-t-primary font-bold active:scale-95 transition-all disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !croppedAreaPixels}
              className="flex-1 py-3 rounded-2xl bg-[#3B5FE6] text-white font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
