// DOC-DEPS: LLM.md -> docs/PROJECT_MAP.md -> src/features/chat/README.md
import React, { useRef, useState, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Camera, X, Loader2, AlertCircle, ZoomIn } from 'lucide-react';
import { useImageUpload } from '../../../hooks/useImageUpload';
import type { ChatImageSlot } from '../../../lib/chatImageStorage';
import { ImageCropModal } from './ImageCropModal';

interface AdditionalImageUploadTarget {
  slot: ChatImageSlot;
  onUploaded: (url: string) => void;
}

interface PendingImageUpload extends AdditionalImageUploadTarget {
  file: File;
}

export interface ImageUploaderProps {
  messageId: string;
  slot?: ChatImageSlot;
  imageUrl?: string | null;
  onUploaded: (url: string) => void;
  additionalUploadTarget?: AdditionalImageUploadTarget;
  onRemoved:  () => void;
  compact?: boolean;
  hideUploadWhen?: boolean;
  hideUploadButton?: boolean;
  openSignal?: number;
  readonly?: boolean;
  hidden?: boolean;
}

export interface ImageUploaderHandle {
  openFilePicker: () => void;
}

export const ImageUploader = React.forwardRef<ImageUploaderHandle, ImageUploaderProps>(({ 
  messageId, slot = 'imageUrl', imageUrl, onUploaded, additionalUploadTarget,
  onRemoved, compact, hideUploadWhen, hideUploadButton, openSignal, readonly, hidden,
}, ref) => {
  const { t } = useTranslation();
  const { upload, remove, uploading } = useImageUpload();
  const inputRef  = useRef<HTMLInputElement>(null);
  const imageRef  = useRef<HTMLDivElement>(null);
  const [error, setError]             = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingImageUpload[]>([]);
  const [processingCrop, setProcessingCrop] = useState(false);
  const [imageTapped, setImageTapped] = useState(false);
  const [lightbox, setLightbox]       = useState(false);
  const [isClient, setIsClient]       = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const inBodyPortal = (node: React.ReactNode) => {
    if (!isClient) return null;
    return createPortal(node, document.body);
  };

  // Dismiss image overlay on tap outside
  useEffect(() => {
    if (!imageTapped) return;
    const handler = (e: MouseEvent) => {
      if (imageRef.current && !imageRef.current.contains(e.target as Node)) {
        setImageTapped(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [imageTapped]);


  const openFilePicker = () => {
    if (readonly || imageUrl || uploading || pendingUploads.length > 0) return;
    inputRef.current?.click();
  };

  useImperativeHandle(ref, () => ({ openFilePicker }), [
    readonly, imageUrl, uploading, pendingUploads.length,
  ]);

  useEffect(() => {
    if (!openSignal) return;
    openFilePicker();
  }, [openSignal, imageUrl, uploading, readonly]);

  const handleCropConfirm = async (blob: Blob) => {
    const currentUpload = pendingUploads[0];
    if (!currentUpload || processingCrop) return;
    setProcessingCrop(true);
    setError(false);
    try {
      const url = await upload(blob, messageId, currentUpload.slot);
      currentUpload.onUploaded(url);
    } catch {
      setError(true);
    } finally {
      setPendingUploads(current => current.slice(1));
      setProcessingCrop(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const targets: AdditionalImageUploadTarget[] = [
      { slot, onUploaded },
      ...(additionalUploadTarget ? [additionalUploadTarget] : []),
    ];
    setPendingUploads(files.slice(0, targets.length).map((file, index) => ({
      file,
      ...targets[index],
    })));
  };

  const handleCropCancel = () => {
    setPendingUploads(current => current.slice(1));
  };

  const handleRemove = async () => {
    setImageTapped(false);
    await remove(messageId, slot, imageUrl ?? undefined);
    onRemoved();
  };

  // Hidden file input is always rendered
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple={Boolean(additionalUploadTarget)}
      className="hidden"
      onChange={handleFileChange}
    />
  );

  if (hidden) return (
    <>
      {fileInput}
      {pendingUploads[0] && !processingCrop && inBodyPortal(
        <ImageCropModal
          file={pendingUploads[0].file}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />,
      )}
    </>
  );

  // ── Image uploaded: thumbnail + overlay ──────────────────────
  if (imageUrl) {
    return (
      <>
        {fileInput}

        {/* Thumbnail */}
        <div
          ref={imageRef}
          className="relative rounded-lg overflow-hidden cursor-pointer"
          onClick={() => setImageTapped(v => !v)}
        >
          <img
            src={imageUrl}
            alt=""
            className={compact ? 'w-full h-20 object-cover' : 'w-full max-h-48 object-cover'}
          />

          {/* Tap-to-show overlay buttons */}
          {imageTapped && (
            <div className="absolute inset-0 bg-black/20 flex items-start justify-end p-1.5 gap-1.5">
              <button
                onClick={e => { e.stopPropagation(); setImageTapped(false); setLightbox(true); }}
                className="p-1.5 bg-black/50 rounded-full text-white"
              >
                <ZoomIn size={13} />
              </button>
              {!readonly && (
                <button
                  onClick={e => { e.stopPropagation(); void handleRemove(); }}
                  className="p-1.5 bg-black/50 rounded-full text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lightbox: full-screen image view */}
        {lightbox && inBodyPortal(
          <div
            className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center"
            style={{ zIndex: 320, paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)', paddingLeft: 'env(safe-area-inset-left,0px)', paddingRight: 'env(safe-area-inset-right,0px)' }}
            onClick={() => setLightbox(false)}
          >
            <img
              src={imageUrl}
              alt=""
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setLightbox(false)}
              className="app-hit-target-44 mt-5 flex items-center justify-center w-10 h-10 bg-white/15 hover:bg-white/25 rounded-full text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>,
        )}

        {/* Crop modal — only for new uploads */}
        {pendingUploads[0] && !processingCrop && inBodyPortal(
          <ImageCropModal
            file={pendingUploads[0].file}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />,
        )}
      </>
    );
  }

  if (hideUploadWhen || hideUploadButton) return (
    <>
      {fileInput}
      {pendingUploads[0] && !processingCrop && inBodyPortal(
        <ImageCropModal
          file={pendingUploads[0].file}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />,
      )}
    </>
  );

  return (
    <>
      {fileInput}

      <div className="mt-0">
        {uploading ? (
          <div className="flex items-center justify-center w-7 h-7">
            <Loader2 size={14} className="animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <button
            onClick={() => { setError(false); openFilePicker(); }}
            title={t('image_upload_fail')}
            className="app-hit-target-44 flex items-center justify-center w-7 h-7 text-red-400 hover:text-red-600 transition-colors"
          >
            <AlertCircle size={14} />
          </button>
        ) : (
          <button
            onClick={openFilePicker}
            title={t('image_upload')}
            className="app-hit-target-44 flex items-center justify-center w-7 h-7 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <Camera size={15} />
          </button>
        )}
      </div>

      {pendingUploads[0] && !processingCrop && inBodyPortal(
        <ImageCropModal
          file={pendingUploads[0].file}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />,
      )}
    </>
  );
});

ImageUploader.displayName = 'ImageUploader';
