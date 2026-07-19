import { useEffect, useRef, useState } from 'react';

export const useProctoring = (sessionId, token, API_URL, onWarning, maxViolations = 3) => {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [proctoringError, setProctoringError] = useState(null);
  const [violationCount, setViolationCount] = useState(0);
  const [loadingModels, setLoadingModels] = useState(true);
  const [isCameraDisabled, setIsCameraDisabled] = useState(false);
  const [deviceSpotted, setDeviceSpotted] = useState(false);
  
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const cocoIntervalRef = useRef(null);
  const faceNotVisibleCounter = useRef(0);
  const multipleFacesCounter = useRef(0);
  
  const cocoModelRef = useRef(null);
  const lastTriggeredTimesRef = useRef({});

  // Helper function to inject script tags dynamically
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  };

  // Preload face-api and COCO-SSD model weights on hook mount
  useEffect(() => {
    let active = true;
    const preloadModels = async () => {
      try {
        setLoadingModels(true);

        // Inject script tags on hook mount (lazy demand loading)
        await Promise.all([
          loadScript('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.19.0/dist/tf.min.js')
        ]);
        // coco-ssd relies on tf object, load afterwards
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');

        const faceapi = window.faceapi;
        const cocoSsd = window.cocoSsd;

        if (!faceapi) {
          console.warn('Face-API script was not loaded. Fallback enabled.');
        }

        // Initialize tfjs backend to WebGL / CPU
        if (faceapi && faceapi.tf) {
          try {
            await faceapi.tf.setBackend('webgl');
            await faceapi.tf.ready();
          } catch {
            console.warn('WebGL backend failed, using CPU backend');
            await faceapi.tf.setBackend('cpu');
            await faceapi.tf.ready();
          }
        }

        // Preload TinyFaceDetector weights from client local /models folder
        if (faceapi) {
          await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
          console.log('Face-api models preloaded.');
        }

        // Preload COCO-SSD weights
        if (cocoSsd) {
          console.log('Loading COCO-SSD object detection engine...');
          const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
          cocoModelRef.current = model;
          console.log('COCO-SSD models preloaded successfully.');
        } else {
          console.warn('COCO-SSD CDN scripts not available. Device checks disabled.');
        }
      } catch (err) {
        console.error('Failed to preload proctoring models:', err);
        if (active) setProctoringError('Proctoring models pre-load error.');
      } finally {
        if (active) setLoadingModels(false);
      }
    };

    preloadModels();
    return () => {
      active = false;
    };
  }, []);

  const logViolation = async (eventType, severity, metadata = null) => {
    try {
      console.warn(`[Proctoring Flagged] Event: ${eventType}, Severity: ${severity}`);
      const res = await fetch(`${API_URL}/proctoring/log-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, eventType, severity, metadata }),
      });
      if (res.ok) {
        setViolationCount((c) => c + 1);
        if (onWarning) {
          onWarning(eventType);
        }
      }
    } catch (err) {
      console.error('Failed to log proctoring violation:', err);
    }
  };

  // 1. Tab Switch focus tracker (Page Visibility API only)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab-switch', 'high');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, token, API_URL]);

  // Expose automatic disqualifier at 100% threshold
  useEffect(() => {
    if (violationCount >= maxViolations && maxViolations > 0) {
      const triggerDisqualification = async () => {
        try {
          console.warn('[Security Disqualification] Auto-disqualifying session due to warning limit');
          await fetch(`${API_URL}/sessions/end`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ sessionId, action: 'disqualify' })
          });
        } catch (err) {
          console.error('Failed to execute auto-disqualify API:', err);
        }
      };
      triggerDisqualification();
    }
  }, [violationCount, maxViolations, sessionId, token, API_URL]);

  // 2. Webcam Stream and Face-API + COCO-SSD Detection Loop
  const startProctoring = async (videoElement) => {
    if (!videoElement || isCameraDisabled) return;

    try {
      // Get User Webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: { max: 10 } },
        audio: false,
      });
      streamRef.current = stream;
      videoElement.srcObject = stream;
      setIsWebcamActive(true);
      setProctoringError(null);
      setIsCameraDisabled(false);

      const faceapi = window.faceapi;
      
      // Face-API Detection Check Loop (Every 1 second)
      if (faceapi) {
        intervalRef.current = setInterval(async () => {
          if (!videoElement || videoElement.paused || videoElement.ended || videoElement.videoWidth === 0) return;

          try {
            const detections = await faceapi.detectAllFaces(
              videoElement,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 })
            );

            if (detections.length === 0) {
              faceNotVisibleCounter.current += 1;
              multipleFacesCounter.current = 0;

              if (faceNotVisibleCounter.current >= 2) {
                logViolation('face-not-visible', 'medium');
                faceNotVisibleCounter.current = 0; 
              }
            } else if (detections.length > 1) {
              multipleFacesCounter.current += 1;
              faceNotVisibleCounter.current = 0;

              if (multipleFacesCounter.current >= 2) {
                logViolation('multiple-faces', 'high');
                multipleFacesCounter.current = 0;
              }
            } else {
              faceNotVisibleCounter.current = 0;
              multipleFacesCounter.current = 0;
            }
          } catch (err) {
            console.error('Error during face detection check:', err);
          }
        }, 1000);
      }

      // COCO-SSD Device Detection Check Loop (Every 5 seconds)
      if (cocoModelRef.current) {
        cocoIntervalRef.current = setInterval(async () => {
          if (!videoElement || videoElement.paused || videoElement.ended || videoElement.videoWidth === 0) return;

          try {
            const predictions = await cocoModelRef.current.detect(videoElement);
            const classesToWatch = ["cell phone", "laptop", "book", "tablet", "camera"];
            let spotted = false;

            for (const pred of predictions) {
              const matchedClass = pred.class.toLowerCase();
              if (classesToWatch.includes(matchedClass) && pred.score >= 0.5) {
                spotted = true;

                // Cache throttle: emit DEVICE_DETECTED once per class every 30 seconds
                const now = Date.now();
                const lastTriggered = lastTriggeredTimesRef.current[matchedClass] || 0;
                
                if (now - lastTriggered > 30000) {
                  lastTriggeredTimesRef.current[matchedClass] = now;
                  
                  // Emit DEVICE_DETECTED violation
                  await logViolation('DEVICE_DETECTED', 'high', {
                    object: pred.class,
                    confidence: pred.score,
                    boundingBox: pred.bbox,
                  });
                }
              }
            }

            setDeviceSpotted(spotted);
          } catch (err) {
            console.error('Error during device detection check:', err);
          }
        }, 5000);
      }

    } catch (err) {
      console.warn('Webcam acquisition failed. Standard testing continues without camera checks:', err);
      setIsCameraDisabled(true);
      setIsWebcamActive(false);
      setProctoringError('Webcam blocked or unavailable. Camera checks disabled.');
      
      // Log camera verification status as failed to the backend
      fetch(`${API_URL}/proctoring/verify-webcam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'failed' }),
      }).catch(console.error);
    }
  };

  const stopProctoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (cocoIntervalRef.current) {
      clearInterval(cocoIntervalRef.current);
      cocoIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
    setDeviceSpotted(false);
  };

  useEffect(() => {
    return () => {
      stopProctoring();
    };
  }, []);

  return {
    isWebcamActive,
    proctoringError,
    violationCount,
    maxViolations,
    loadingModels,
    isCameraDisabled,
    deviceSpotted,
    startProctoring,
    stopProctoring,
    logViolation,
  };
};
