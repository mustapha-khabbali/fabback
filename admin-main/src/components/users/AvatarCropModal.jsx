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
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-[12px] font-black text-white uppercase tracking-[2px]">{title}</h3>
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
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Zoom</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-accent-blue"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[12px] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !croppedAreaPixels}
              className="flex-1 bg-accent-blue hover:bg-accent-blue/85 text-white text-[12px] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
