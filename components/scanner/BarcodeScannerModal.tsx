'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (sku: string) => void
  title?: string
  description?: string
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan SKU / Barcode',
  description = 'Point your camera at a 1D barcode or 2D QR code',
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [cameraError, setCameraError] = useState('')
  const [isInitializing, setIsInitializing] = useState(true)
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  // Play subtle scan beep sound (gracefully fail if audio blocked)
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch {
      // Ignore audio errors in restricted browser contexts
    }
  }, [])

  // Clean unmount helper for camera and streams
  const stopCamera = useCallback(() => {
    try {
      if (controlsRef.current) {
        controlsRef.current.stop()
        controlsRef.current = null
      }
      if (videoRef.current) {
        // Do not manually stop tracks here, controls.stop() handles it.
        // Manually stopping tracks causes "setPhotoOptions failed" in ZXing's internal loop
        BrowserMultiFormatReader.cleanVideoSource(videoRef.current)
      }
      setTorchOn(false)
      setHasTorch(false)
    } catch (err) {
      console.warn('Error stopping camera:', err)
    }
  }, [])

  const startScanning = useCallback(
    async (deviceId?: string) => {
      stopCamera()
      setCameraError('')
      setIsInitializing(true)

      try {
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices()
        setDevices(videoDevices)

        if (videoDevices.length === 0) {
          throw new Error('No camera found on this device')
        }

        // Determine device to use (prefer rear/environment camera)
        let targetDevice = deviceId
          ? videoDevices.find((d) => d.deviceId === deviceId)
          : videoDevices.find((d) => /back|rear|environment/i.test(d.label))

        if (targetDevice) {
          setSelectedDeviceId(targetDevice.deviceId)
        }

        if (!videoRef.current) return

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: targetDevice ? { exact: targetDevice.deviceId } : undefined,
            facingMode: targetDevice ? undefined : "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        }

        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result, err) => {
            if (result) {
              const text = result.getText().trim()
              if (text) {
                playBeep()
                stopCamera()
                onScan(text)
              }
            }
            if (err && !(err instanceof NotFoundException)) {
              // Ignore normal frame-level not found exceptions
            }
          }
        )

        controlsRef.current = controls
        setIsInitializing(false)

        // Check torch capabilities
        try {
          const stream = videoRef.current?.srcObject as MediaStream | null
          const track = stream?.getVideoTracks()[0]
          if (track && typeof track.getCapabilities === 'function') {
            const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
            if (capabilities.torch) {
              setHasTorch(true)
            }
          }
        } catch {
          setHasTorch(false)
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access.'
              : err.message
            : 'Could not access camera'
        setCameraError(message)
        setIsInitializing(false)
      }
    },
    [onScan, playBeep, stopCamera]
  )

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!controlsRef.current?.switchTorch) return
    try {
      const nextState = !torchOn
      await controlsRef.current.switchTorch(nextState)
      setTorchOn(nextState)
    } catch {
      // Torch not supported on current platform
    }
  }

  // Switch camera if multiple exist
  const handleDeviceChange = (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId)
    startScanning(newDeviceId)
  }

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      startScanning()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, startScanning, stopCamera])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    // Suppress harmless "setPhotoOptions failed" unhandled rejections that trigger the Next.js overlay
    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && e.reason.message && e.reason.message.includes('setPhotoOptions')) {
        e.preventDefault()
      }
    }
    
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-lg glass-card overflow-hidden z-10 border border-[var(--color-border)] shadow-2xl bg-[var(--color-surface)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/15 border border-blue-500/30 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
                  <rect x="7" y="7" width="10" height="10" rx="1"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-xs text-muted">{description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close scanner"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Viewfinder Area */}
          <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Initializing / Loading state */}
            {isInitializing && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-xs text-white">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-slate-300">Accessing camera...</p>
              </div>
            )}

            {/* Scanning Viewfinder Overlay (Target Box & Scan Line) */}
            {!cameraError && !isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 relative">
                  {/* Viewfinder Corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-sm shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-sm shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-sm shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-tr-sm shadow-[0_0_8px_rgba(59,130,246,0.6)]" />

                  {/* Animated Laser Scanning Line */}
                  <motion.div
                    className="absolute left-1 right-1 h-0.5"
                    style={{
                      background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.8), 0 0 20px rgba(59, 130, 246, 0.4)',
                    }}
                    animate={{ top: ['8%', '92%', '8%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Center hint */}
                  <div className="absolute inset-x-0 bottom-3 text-center">
                    <span className="text-[11px] font-medium bg-black/60 backdrop-blur-sm text-slate-300 px-2 py-0.5 rounded-full border border-white/10">
                      Align barcode in box
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/90">
                <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-danger mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-white mb-1">Camera Error</p>
                <p className="text-xs text-muted max-w-xs mb-4">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startScanning(selectedDeviceId)}
                  className="btn btn-secondary btn-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-[var(--color-surface-2)] flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="input text-xs py-1.5 px-2.5 max-w-[200px]"
                >
                  {devices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`btn btn-sm ${torchOn ? 'btn-primary' : 'btn-secondary'}`}
                  title="Toggle Flashlight"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  {torchOn ? 'Torch On' : 'Torch Off'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm ml-auto"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
