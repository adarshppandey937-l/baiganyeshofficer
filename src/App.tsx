import React, { useState, useEffect, useMemo, useRef } from 'react';
import Hls from 'hls.js';
import {
  Sparkles,
  Bookmark,
  Search,
  X,
  Check,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Share2,
  BookOpen,
  PlayCircle,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Maximize2,
  Volume2,
  VolumeX,
  FileText,
  Clock,
  Award,
  Layers,
  GraduationCap,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Download,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Sliders,
  Tv,
  Film,
  Send,
  MessageCircle,
  ChevronLeft
} from 'lucide-react';
import { INITIAL_BATCHES, Batch } from './data/batches.ts';

const PROFILE_PHOTO_URL =
  'https://i.postimg.cc/wv3RgCjh/Screenshot-2026-07-30-13-33-52-41-948cd9899890cbd5c2798760b2b95377.jpg';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDcWLp8PgsHZKtwRd0z';

const ITEMS_PER_PAGE = 12;

interface ToastInfo {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ContentItem {
  id: string;
  parent_id?: string;
  Title?: string;
  title?: string;
  material_type?: string;
  type?: string;
  thumbnail?: string;
  duration?: string;
  duration_in_secs?: string;
  event_date?: string;
  date_and_time?: string;
  file_link?: string;
  pdf_link?: string;
  videos_count?: string | number;
  files_count?: string | number;
  tests_count?: string | number;
}

interface VideoDetail {
  success: boolean;
  video_id: string;
  course_id: string;
  title: string;
  duration?: string;
  thumbnail?: string;
  decoded_video_link?: string;
  youtube_id?: string;
  qualities?: Array<{ quality: string; url: string; rawUrl?: string }>;
  pdf_url?: string;
}

interface ViewingPdfInfo {
  title: string;
  courseId: string | number;
  subjectType: string;
  pdfUrl?: string;
  viewMode: 'interactive' | 'pdf';
}

interface NavCrumb {
  id: string;
  title: string;
}

export default function App() {
  const [batches] = useState<Batch[]>(INITIAL_BATCHES);
  const [activeTab, setActiveTab] = useState<'latest' | 'enrolled'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Selected batch for studying
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // Course folder contents navigation
  const [navStack, setNavStack] = useState<NavCrumb[]>([{ id: '-1', title: 'Batch Content' }]);
  const [folderItems, setFolderItems] = useState<ContentItem[]>([]);
  const [isFolderLoading, setIsFolderLoading] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Active playing video state
  const [activeVideo, setActiveVideo] = useState<VideoDetail | null>(null);
  const [playerMode, setPlayerMode] = useState<'hls' | 'backup' | 'youtube'>('hls');
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoPlaybackRate, setVideoPlaybackRate] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Classroom PDF Notes Modal
  const [viewingPdf, setViewingPdf] = useState<ViewingPdfInfo | null>(null);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfZoom, setPdfZoom] = useState<number>(100);

  // WhatsApp Popup Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);

  // Auto-show WhatsApp popup after 2.5 seconds on first visit
  useEffect(() => {
    const hasSeen = sessionStorage.getItem('pandey_wa_modal_seen');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setShowWhatsAppModal(true);
        sessionStorage.setItem('pandey_wa_modal_seen', 'true');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Wishlist / Enrollment state stored in localStorage (synced with studybee_wishlist)
  const [enrolledIds, setEnrolledIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('studybee_wishlist');
      if (saved) return JSON.parse(saved).map(String);
    } catch {
      // ignore
    }
    return [];
  });

  // Toast notification state
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const newToast: ToastInfo = { id: Date.now(), message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 3200);
  };

  const toggleEnroll = (batchId: number | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idStr = String(batchId);
    setEnrolledIds((prev) => {
      const isEnrolled = prev.includes(idStr);
      let updated: string[];
      if (isEnrolled) {
        updated = prev.filter((id) => id !== idStr);
        showToast('Batch removed from enrollments', 'info');
      } else {
        updated = [...prev, idStr];
        showToast('Enrolled in batch successfully!', 'success');
      }
      try {
        localStorage.setItem('studybee_wishlist', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Helper to categorize batch
  const getBatchTag = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('perfection') || lower.includes('nimisha'))
      return { tag: 'Nimisha Bansal', subject: 'english', color: 'from-pink-500/20 to-purple-500/20 text-pink-300 border-pink-500/30' };
    if (lower.includes('quant') || lower.includes('aashish') || lower.includes('maths') || lower.includes('udaan'))
      return { tag: 'Aashish Arora', subject: 'quant', color: 'from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30' };
    if (lower.includes('reasoning') || lower.includes('ankush') || lower.includes('di 360'))
      return { tag: 'Ankush Lamba', subject: 'reasoning', color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30' };
    if (lower.includes('kush') || lower.includes('gk') || lower.includes('ga') || lower.includes('bharat') || lower.includes('safalta'))
      return { tag: 'Kush Pandey', subject: 'gk', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30' };
    if (lower.includes('interview') || lower.includes('boot camp'))
      return { tag: 'Interview Prep', subject: 'interview', color: 'from-violet-500/20 to-indigo-500/20 text-violet-300 border-violet-500/30' };
    return { tag: 'Banking Special', subject: 'general', color: 'from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/30' };
  };

  const categoryFilters = [
    { label: 'All', value: 'All' },
    { label: 'Nimisha Bansal', value: 'Nimisha' },
    { label: 'Aashish Arora', value: 'Aashish' },
    { label: 'Ankush Lamba', value: 'Ankush' },
    { label: 'Kush Pandey', value: 'Kush' },
    { label: 'Mains & Prelims', value: 'Mains' },
    { label: 'E-Books & PDFs', value: 'Ebook' },
  ];

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      if (activeTab === 'enrolled' && !enrolledIds.includes(String(batch.id))) return false;

      if (selectedCategory !== 'All') {
        const titleLower = batch.title.toLowerCase();
        if (selectedCategory === 'Nimisha' && !titleLower.includes('nimisha') && !titleLower.includes('perfection')) return false;
        if (selectedCategory === 'Aashish' && !titleLower.includes('aashish') && !titleLower.includes('quant') && !titleLower.includes('maths') && !titleLower.includes('udaan')) return false;
        if (selectedCategory === 'Ankush' && !titleLower.includes('ankush') && !titleLower.includes('reasoning')) return false;
        if (selectedCategory === 'Kush' && !titleLower.includes('kush') && !titleLower.includes('gk') && !titleLower.includes('bharat') && !titleLower.includes('safalta')) return false;
        if (selectedCategory === 'Mains' && !titleLower.includes('mains') && !titleLower.includes('prelims') && !titleLower.includes('po')) return false;
        if (selectedCategory === 'Ebook' && !titleLower.includes('ebook') && !titleLower.includes('book') && !titleLower.includes('pdf')) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = batch.title.toLowerCase().includes(query);
        const matchId = String(batch.id).includes(query);
        if (!matchTitle && !matchId) return false;
      }

      return true;
    });
  }, [batches, activeTab, enrolledIds, selectedCategory, searchQuery]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeTab, selectedCategory, searchQuery]);

  const visibleBatches = useMemo(() => {
    return filteredBatches.slice(0, visibleCount);
  }, [filteredBatches, visibleCount]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }, 280);
  };

  const handleCopyShareLink = (batch?: Batch) => {
    const url = window.location.href.split('?')[0] + (batch ? `?batchId=${batch.id}` : '');
    navigator.clipboard
      ?.writeText(url)
      .then(() => showToast('Batch link copied to clipboard!', 'success'))
      .catch(() => showToast('Could not copy link', 'error'));
  };

  // Fetch folder contents for selected batch & current folder in navigation stack
  const fetchCurrentFolderContents = async (courseId: number | string, parentId: string) => {
    setIsFolderLoading(true);
    setFolderError(null);
    try {
      const res = await fetch(`/api/folder_contents?course_id=${courseId}&parent_id=${parentId}`);
      if (!res.ok) throw new Error('Failed to load batch lectures');
      const data = await res.json();
      if (data && data.status === 200 && Array.isArray(data.data)) {
        setFolderItems(data.data);
      } else {
        setFolderItems([]);
      }
    } catch (err: unknown) {
      console.error(err);
      setFolderError(err instanceof Error ? err.message : 'Error fetching folder contents');
    } finally {
      setIsFolderLoading(false);
    }
  };

  // When selectedBatch changes, reset navigation and fetch root folder
  useEffect(() => {
    if (selectedBatch) {
      setNavStack([{ id: '-1', title: selectedBatch.title }]);
      setActiveVideo(null);
      fetchCurrentFolderContents(selectedBatch.id, '-1');
    }
  }, [selectedBatch]);

  // Navigate to subfolder
  const navigateToFolder = (folderId: string, folderTitle: string) => {
    if (!selectedBatch) return;
    setNavStack((prev) => [...prev, { id: folderId, title: folderTitle }]);
    fetchCurrentFolderContents(selectedBatch.id, folderId);
  };

  // Jump to breadcrumb
  const jumpToBreadcrumb = (index: number) => {
    if (!selectedBatch) return;
    const target = navStack[index];
    const newStack = navStack.slice(0, index + 1);
    setNavStack(newStack);
    fetchCurrentFolderContents(selectedBatch.id, target.id);
  };

  // Go back one folder
  const handleFolderGoBack = () => {
    if (navStack.length > 1) {
      jumpToBreadcrumb(navStack.length - 2);
    } else {
      setSelectedBatch(null);
      setActiveVideo(null);
    }
  };

  // Play video item with immediate start
  const handlePlayVideo = async (videoId: string, fallbackTitle: string) => {
    if (!selectedBatch) return;
    setIsVideoLoading(true);
    try {
      const res = await fetch(`/api/video_details?course_id=${selectedBatch.id}&video_id=${videoId}`);
      const data: VideoDetail = await res.json();
      if (data && data.success) {
        setActiveVideo(data);
        if (data.qualities && data.qualities.length > 0) {
          setSelectedQuality(data.qualities[0].quality);
        }
        setPlayerMode('hls');
        showToast(`Playing: ${data.title || fallbackTitle}`, 'success');
      } else {
        setActiveVideo({
          success: true,
          video_id: videoId,
          course_id: String(selectedBatch.id),
          title: fallbackTitle,
          duration: '1 hrs 15 mins',
          decoded_video_link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          youtube_id: 'kJQP7kiw5Fk',
        });
        setPlayerMode('backup');
        showToast(`Playing: ${fallbackTitle}`, 'success');
      }
    } catch {
      setActiveVideo({
        success: true,
        video_id: videoId,
        course_id: String(selectedBatch.id),
        title: fallbackTitle,
        duration: '1 hrs 15 mins',
        decoded_video_link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        youtube_id: 'kJQP7kiw5Fk',
      });
      setPlayerMode('backup');
      showToast(`Playing: ${fallbackTitle}`, 'success');
    } finally {
      setIsVideoLoading(false);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Synchronize HLS / MP4 video stream with HTML video element
  useEffect(() => {
    if (!activeVideo || playerMode === 'youtube') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let streamUrl = '';
    if (playerMode === 'backup') {
      streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    } else {
      const matchQ = activeVideo.qualities?.find((q) => q.quality === selectedQuality);
      streamUrl = matchQ?.url || activeVideo.decoded_video_link || '';
    }

    if (!streamUrl) return;

    const isHlsStream = streamUrl.includes('.m3u8') || streamUrl.includes('/api/video');

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay with audio was blocked by browser; user can click center play button
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('HLS stream fatal error, falling back to backup server:', data);
          hls.destroy();
          hlsRef.current = null;
          setPlayerMode('backup');
          showToast('Switched to high-speed backup mirror', 'info');
        }
      });
    } else if (isHlsStream && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari iOS / MacOS native HLS
      videoEl.src = streamUrl;
      videoEl
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      // Direct MP4 stream
      videoEl.src = streamUrl;
      videoEl
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeVideo, playerMode, selectedQuality]);

  // Video playback controls
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
  };

  const changeSpeed = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setVideoPlaybackRate(rate);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = Number(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Open Classroom PDF Viewer
  const handleOpenPdf = (title: string, courseId?: number | string, pdfLink?: string) => {
    const id = courseId || selectedBatch?.id || '295';
    const tag = getBatchTag(selectedBatch?.title || title);
    let resolvedPdfUrl = '';
    if (pdfLink && pdfLink.startsWith('http')) {
      resolvedPdfUrl = `/api/pdf_proxy?url=${encodeURIComponent(pdfLink)}&title=${encodeURIComponent(title)}&course_id=${id}`;
    } else if (pdfLink && pdfLink.startsWith('/api/')) {
      resolvedPdfUrl = pdfLink;
    } else {
      resolvedPdfUrl = `/api/pdf?title=${encodeURIComponent(title)}&course_id=${id}`;
    }

    setViewingPdf({
      title,
      courseId: id,
      subjectType: tag.subject,
      pdfUrl: resolvedPdfUrl,
      viewMode: 'interactive',
    });
    setPdfPage(1);
    setPdfZoom(100);
  };

  const openWhatsApp = () => {
    window.open(WHATSAPP_CHANNEL_URL, '_blank');
    setShowWhatsAppModal(false);
    showToast('Opening WhatsApp Channel...', 'success');
  };

  // Check URL query on initial load to open specific batch if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const batchIdParam = params.get('id') || params.get('batchId') || params.get('courseId');
    if (batchIdParam) {
      const found = batches.find((b) => String(b.id) === String(batchIdParam));
      if (found) setSelectedBatch(found);
    }
  }, [batches]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans flex flex-col selection:bg-[#FACC15] selection:text-black">
      {/* Toast notifications */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-[0_12px_35px_rgba(0,0,0,0.85)] border transition-all animate-bounce-short ${
              toast.type === 'success'
                ? 'bg-[#0f291e] border-emerald-500/40 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-[#331111] border-red-500/40 text-red-300'
                : 'bg-[#1e1c14] border-amber-500/40 text-amber-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Floating WhatsApp Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowWhatsAppModal(true)}
          className="group relative flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-bold shadow-[0_10px_25px_rgba(37,211,102,0.4)] hover:shadow-[0_12px_30px_rgba(37,211,102,0.6)] hover:scale-105 transition-all btn-click-effect"
          title="Join WhatsApp Channel"
        >
          {/* Custom crisp SVG WhatsApp Icon */}
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-full h-full fill-white" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.176 8.176 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.5 11.66c-.25.7-.72 1.3-1.36 1.7-.58.37-1.34.56-2.19.56-1.32 0-2.6-.45-3.69-1.28-1.55-1.18-2.6-2.73-3.13-4.63-.26-.95-.34-1.89-.25-2.77.08-.82.38-1.57.87-2.17.29-.35.68-.55 1.13-.55.15 0 .3.03.44.09.43.19.68.73.86 1.18.19.46.4 1.05.47 1.18.06.13.07.28.02.41-.05.13-.13.25-.23.36l-.32.37c-.12.13-.25.26-.14.47.37.7 1.02 1.48 1.78 2.06.94.72 1.79.97 2.11 1.11.23.1.37.07.49-.07.15-.17.63-.74.8-1 .15-.22.31-.19.52-.11.21.08 1.34.63 1.57.74.23.11.38.17.44.27.06.1.06.58-.19 1.28z" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-extrabold tracking-wide hidden sm:inline">
            Join WhatsApp Channel
          </span>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 rounded-full animate-ping" />
        </button>
      </div>

      {/* WhatsApp Modal Popup */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-md bg-[#121212] border border-[#25D366]/40 rounded-3xl shadow-[0_20px_60px_rgba(37,211,102,0.25)] p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-[#25D366]/10 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* WhatsApp Big Emblem */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#25D366] to-[#128C7E] flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(37,211,102,0.5)] p-4">
              <svg viewBox="0 0 24 24" className="w-full h-full fill-white" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.176 8.176 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.5 11.66c-.25.7-.72 1.3-1.36 1.7-.58.37-1.34.56-2.19.56-1.32 0-2.6-.45-3.69-1.28-1.55-1.18-2.6-2.73-3.13-4.63-.26-.95-.34-1.89-.25-2.77.08-.82.38-1.57.87-2.17.29-.35.68-.55 1.13-.55.15 0 .3.03.44.09.43.19.68.73.86 1.18.19.46.4 1.05.47 1.18.06.13.07.28.02.41-.05.13-.13.25-.23.36l-.32.37c-.12.13-.25.26-.14.47.37.7 1.02 1.48 1.78 2.06.94.72 1.79.97 2.11 1.11.23.1.37.07.49-.07.15-.17.63-.74.8-1 .15-.22.31-.19.52-.11.21.08 1.34.63 1.57.74.23.11.38.17.44.27.06.1.06.58-.19 1.28z" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-black uppercase tracking-wider mb-2">
              <Check className="w-3.5 h-3.5" /> Official Community
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white font-syne mb-2">
              Join PANDEY JI WhatsApp Channel
            </h3>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed mb-6">
              Daily Class Notes PDF, New Batches Update, Video Lectures, aur Exam Study Material direct apne WhatsApp par paane ke liye abhi join karein!
            </p>

            <button
              onClick={openWhatsApp}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-[0_10px_25px_rgba(37,211,102,0.4)] btn-click-effect mb-3"
            >
              <Send className="w-4 h-4 fill-black" /> Join WhatsApp Channel Now
            </button>

            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="text-stone-500 hover:text-stone-300 text-xs font-semibold py-1 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="w-full z-40 nav-glass h-[72px] sticky top-0 transition-all border-b border-white/5">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          {/* Left: Round Photo Frame + PANDEY JI branding */}
          <div
            onClick={() => {
              setActiveTab('latest');
              setSelectedCategory('All');
              setSearchQuery('');
              setSelectedBatch(null);
              setActiveVideo(null);
            }}
            className="flex items-center gap-3 cursor-pointer btn-click-effect select-none group"
            title="PANDEY JI - Home"
          >
            {/* Gol frame (circular frame) for the user's photo */}
            <div className="relative">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#F59E0B] via-[#FACC15] to-[#fef08a] shadow-[0_0_18px_rgba(250,204,21,0.45)] group-hover:shadow-[0_0_24px_rgba(250,204,21,0.65)] transition-shadow">
                <div className="w-full h-full rounded-full overflow-hidden bg-black border border-black/40">
                  <img
                    src={PROFILE_PHOTO_URL}
                    alt="PANDEY JI"
                    className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0a0a] rounded-full shadow-sm" />
            </div>

            {/* Brand Title: PANDEY JI */}
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white font-syne flex items-center gap-1.5 leading-none">
                PANDEY <span className="text-[#FACC15] drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">JI</span>
              </h1>
              <span className="text-[10px] text-stone-400 font-medium tracking-widest uppercase flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" /> Premium Batches
              </span>
            </div>
          </div>

          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] font-bold text-xs flex items-center gap-2 btn-click-effect transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Channel</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('latest');
                setSelectedBatch(null);
                setActiveVideo(null);
              }}
              className={`px-3.5 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 btn-click-effect ${
                activeTab === 'latest' && !selectedBatch
                  ? 'bg-white/10 text-white border border-white/15 shadow-inner'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#FACC15]" />
              Batches
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-stone-300 ml-1">
                {batches.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('enrolled');
                setSelectedBatch(null);
                setActiveVideo(null);
              }}
              className={`px-3.5 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 btn-click-effect ${
                activeTab === 'enrolled' && !selectedBatch
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              My Enrollments
              {enrolledIds.length > 0 && (
                <span className="bg-[#10B981] text-black text-[11px] font-black px-2 py-0.5 rounded-full ml-1 shadow-sm">
                  {enrolledIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleCopyShareLink()}
              className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 text-stone-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10"
              title="Share Portal"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="p-2.5 border border-[#25D366]/40 rounded-xl bg-[#25D366]/15 text-[#25D366] btn-click-effect"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setActiveTab((prev) => (prev === 'latest' ? 'enrolled' : 'latest'));
                setSelectedBatch(null);
                setActiveVideo(null);
              }}
              className={`p-2.5 border rounded-xl transition-colors btn-click-effect relative ${
                activeTab === 'enrolled'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'text-stone-300 border-white/10 bg-white/5 hover:border-[#FACC15]/40'
              }`}
              aria-label="Toggle Enrollments"
            >
              <Bookmark className="w-4 h-4" />
              {enrolledIds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#10B981] text-black text-[9px] font-black rounded-full flex items-center justify-center">
                  {enrolledIds.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[92rem] mx-auto px-4 sm:px-6 pt-6 pb-16 relative z-10">
        {/* If a batch is selected for studying: Show Full Batch Study & Lecture Portal */}
        {selectedBatch ? (
          <div className="space-y-6">
            {/* Top Navigation & Back Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] border border-white/10 p-4 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFolderGoBack}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors btn-click-effect"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{navStack.length > 1 ? 'Back Folder' : 'All Batches'}</span>
                </button>

                <div className="flex items-center gap-2 overflow-x-auto hide-scroll text-xs sm:text-sm font-semibold text-stone-400">
                  {navStack.map((crumb, idx) => {
                    const isLast = idx === navStack.length - 1;
                    return (
                      <React.Fragment key={crumb.id + idx}>
                        {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />}
                        <button
                          onClick={() => jumpToBreadcrumb(idx)}
                          className={`truncate max-w-[150px] sm:max-w-[240px] transition-colors ${
                            isLast ? 'text-[#FACC15] font-bold pointer-events-none' : 'hover:text-white'
                          }`}
                        >
                          {crumb.title}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleOpenPdf(`${selectedBatch.title} - Complete Notes`)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Class Notes PDF
                </button>

                <button
                  onClick={() => toggleEnroll(selectedBatch.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors btn-click-effect ${
                    enrolledIds.includes(String(selectedBatch.id))
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-[#10B981] hover:bg-emerald-400 text-black'
                  }`}
                >
                  {enrolledIds.includes(String(selectedBatch.id)) ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Enrolled
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Enroll
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Video Player section (when a video is playing) */}
            {activeVideo && (
              <div className="rounded-2xl border border-amber-500/40 bg-black overflow-hidden shadow-2xl relative mb-6">
                {/* Player Header */}
                <div className="p-3 sm:p-4 bg-gradient-to-r from-black via-zinc-900 to-black border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
                        {activeVideo.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-amber-400 font-semibold mt-0.5">
                        <span>PANDEY JI Verified Stream</span>
                        <span>•</span>
                        <span className="text-stone-400 font-normal">{activeVideo.duration || 'Full Lecture'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Server Mode Switches */}
                    <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-0.5 text-xs">
                      <button
                        onClick={() => setPlayerMode('hls')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] transition-colors ${
                          playerMode === 'hls' ? 'bg-[#FACC15] text-black shadow-sm' : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        <Tv className="w-3 h-3" /> Cloud Stream
                      </button>
                      <button
                        onClick={() => setPlayerMode('backup')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] transition-colors ${
                          playerMode === 'backup' ? 'bg-[#FACC15] text-black shadow-sm' : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        <Film className="w-3 h-3" /> Backup Server
                      </button>
                      <button
                        onClick={() => setPlayerMode('youtube')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] transition-colors ${
                          playerMode === 'youtube' ? 'bg-[#FACC15] text-black shadow-sm' : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        <Play className="w-3 h-3" /> Embed Mirror
                      </button>
                    </div>

                    {/* Quality Selector */}
                    {activeVideo.qualities && activeVideo.qualities.length > 0 && playerMode === 'hls' && (
                      <div className="relative">
                        <button
                          onClick={() => setShowQualityMenu(!showQualityMenu)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3 text-[#FACC15]" /> {selectedQuality} <ChevronDown className="w-3 h-3" />
                        </button>
                        {showQualityMenu && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[#141414] border border-white/20 rounded-xl shadow-2xl py-1 z-50">
                            {activeVideo.qualities.map((q) => (
                              <button
                                key={q.quality}
                                onClick={() => {
                                  setSelectedQuality(q.quality);
                                  setShowQualityMenu(false);
                                  showToast(`Quality set to ${q.quality}`, 'info');
                                }}
                                className={`w-full px-3 py-1.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-white/10 ${
                                  selectedQuality === q.quality ? 'text-[#FACC15] bg-white/5' : 'text-stone-300'
                                }`}
                              >
                                {q.quality}
                                {selectedQuality === q.quality && <Check className="w-3.5 h-3.5 text-[#FACC15]" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Open Notes Button */}
                    <button
                      onClick={() => handleOpenPdf(`${activeVideo.title} - Class Notes`, activeVideo.course_id, activeVideo.pdf_url)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Class Notes
                    </button>

                    {/* Close Player */}
                    <button
                      onClick={() => setActiveVideo(null)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-400 hover:text-white"
                      title="Close Player"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Video Display Container */}
                <div className="relative aspect-video w-full bg-black flex items-center justify-center group overflow-hidden">
                  {playerMode === 'youtube' ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtube_id || 'kJQP7kiw5Fk'}?autoplay=1&rel=0&modestbranding=1`}
                      title={activeVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-none"
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <video
                        ref={videoRef}
                        playsInline
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onTimeUpdate={() => {
                          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                        }}
                        onLoadedMetadata={() => {
                          if (videoRef.current) setDuration(videoRef.current.duration);
                        }}
                      />

                      {/* Center Play Overlay when paused or initial load */}
                      {!isPlaying && (
                        <button
                          onClick={togglePlayPause}
                          className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/20 transition-all z-20 cursor-pointer"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FACC15] hover:scale-105 text-black flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.7)] transition-all">
                            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-black ml-1" />
                          </div>
                          <span className="mt-3 px-3.5 py-1 rounded-full bg-black/80 text-white text-xs font-bold border border-white/20">
                            Click to Play Lecture
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Video Controls Bar */}
                {playerMode !== 'youtube' && (
                  <div className="p-2 sm:p-3 bg-[#0d0d0d] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlayPause}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                      </button>
                      <button
                        onClick={() => skipSeconds(-10)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-[11px]"
                        title="Rewind 10s"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> -10s
                      </button>
                      <button
                        onClick={() => skipSeconds(10)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-[11px]"
                        title="Forward 10s"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> +10s
                      </button>
                      <button
                        onClick={toggleMute}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Speed options */}
                    <div className="flex items-center gap-1">
                      <span className="text-stone-400 text-[11px] mr-1">Speed:</span>
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            videoPlaybackRate === rate
                              ? 'bg-[#FACC15] text-black'
                              : 'bg-white/5 text-stone-300 hover:text-white'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                      <button
                        onClick={toggleFullscreen}
                        className="p-1.5 ml-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                        title="Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Folder Header & Batch Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-[#17140e] via-[#121212] to-[#141208] border border-[#FACC15]/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 sm:w-20 aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 shadow-lg">
                  <img
                    src={selectedBatch.thumbnail}
                    alt={selectedBatch.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      BATCH #{selectedBatch.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      VERIFIED ACCESS
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                    {selectedBatch.title}
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Click any folder to open chapters, click &ldquo;Watch&rdquo; to start streaming, and click &ldquo;Class Notes&rdquo; to view or download PDFs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWhatsAppModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Join WhatsApp
                </button>
                <button
                  onClick={() => fetchCurrentFolderContents(selectedBatch.id, navStack[navStack.length - 1].id)}
                  className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFolderLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Folder Items List */}
            {isFolderLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-[#FACC15] border-t-transparent rounded-full animate-spin" />
                <p className="text-stone-400 font-semibold text-sm">Loading course lectures and PDFs...</p>
              </div>
            ) : folderError ? (
              <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-[#141010] border border-red-500/20 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-white font-bold text-sm mb-1">{folderError}</p>
                <button
                  onClick={() => fetchCurrentFolderContents(selectedBatch.id, navStack[navStack.length - 1].id)}
                  className="mt-3 px-4 py-2 rounded-xl bg-[#FACC15] text-black font-bold text-xs"
                >
                  Retry Loading
                </button>
              </div>
            ) : folderItems.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-[#121212] border border-white/5 rounded-2xl">
                <FolderOpen className="w-10 h-10 text-stone-600 mb-3" />
                <h4 className="text-white font-bold text-base mb-1">No Items in this Folder</h4>
                <p className="text-stone-500 text-xs max-w-sm mb-4">
                  This section has no direct sub-lectures. Navigate back to explore other chapters or DPPs.
                </p>
                <button
                  onClick={handleFolderGoBack}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-400 font-semibold px-2">
                  <span>CURRICULUM CONTENT ({folderItems.length} ITEMS)</span>
                  <span>100% Free Complete Access</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {folderItems.map((item, idx) => {
                    const type = (item.material_type || item.type || 'FOLDER').toUpperCase();
                    const title = item.Title || item.title || 'Untitled Session';

                    // If it is a FOLDER
                    if (type === 'FOLDER') {
                      const counts: string[] = [];
                      if (Number(item.videos_count) > 0) counts.push(`${item.videos_count} Videos`);
                      if (Number(item.files_count) > 0) counts.push(`${item.files_count} PDFs`);
                      if (Number(item.tests_count) > 0) counts.push(`${item.tests_count} Tests`);
                      const countText = counts.length > 0 ? counts.join(' • ') : 'Open Folder';

                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => navigateToFolder(item.id, title)}
                          className="p-4 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-white/5 hover:border-[#FACC15]/40 transition-all cursor-pointer flex items-center justify-between gap-4 group btn-click-effect shadow-md"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                              <Folder className="w-6 h-6 fill-amber-400/20" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-white group-hover:text-[#FACC15] transition-colors truncate">
                                {title}
                              </h3>
                              <p className="text-xs text-stone-400 font-medium mt-0.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {countText}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-stone-400 group-hover:text-white hidden sm:inline font-semibold">
                              Explore
                            </span>
                            <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#FACC15] group-hover:text-black flex items-center justify-center transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // If it is a VIDEO
                    if (type === 'VIDEO') {
                      const duration = item.duration || '1:15:00';
                      const dateStr = item.date_and_time || item.event_date || 'Full Syllabus';

                      return (
                        <div
                          key={item.id || idx}
                          className="p-4 rounded-xl bg-[#141414] hover:bg-[#181818] border border-white/5 hover:border-amber-400/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-md"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative w-20 sm:w-24 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt={title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-white/80" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                                {title}
                              </h3>
                              <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-1">
                                <span className="flex items-center gap-1 font-semibold text-stone-300">
                                  <Clock className="w-3 h-3 text-amber-400" /> {duration}
                                </span>
                                <span>•</span>
                                <span>{dateStr}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                              onClick={() => handleOpenPdf(`${title} - Class DPP & Notes`, selectedBatch?.id, item.pdf_link || item.file_link)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" /> Class Notes
                            </button>

                            <button
                              onClick={() => handlePlayVideo(item.id, title)}
                              className="px-4 py-1.5 rounded-lg bg-[#FACC15] hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md"
                            >
                              <Play className="w-3.5 h-3.5 fill-black" /> Watch
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // If it is a PDF or NOTES
                    return (
                      <div
                        key={item.id || idx}
                        className="p-4 rounded-xl bg-[#141414] hover:bg-[#181818] border border-white/5 hover:border-emerald-500/30 transition-all flex items-center justify-between gap-4 group shadow-md"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                              {title}
                            </h3>
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              Official Class PDF • Verified Questions & Solutions
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenPdf(title, selectedBatch?.id, item.file_link || item.pdf_link)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 btn-click-effect shadow-md"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> View Notes
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Normal Batches Listing View */
          <>
            {/* Banner greeting with PANDEY JI branding */}
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#141208] via-[#121212] to-[#12161a] border border-[#FACC15]/20 p-5 sm:p-7 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#FACC15]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-[#F59E0B] via-[#FACC15] to-[#fef08a] shadow-[0_0_20px_rgba(250,204,21,0.35)] shrink-0">
                    <img
                      src={PROFILE_PHOTO_URL}
                      alt="PANDEY JI"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-2xl font-black text-white font-syne tracking-wide">
                        PANDEY JI <span className="text-[#FACC15]">PREMIUM BATCHES</span>
                      </h2>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> 100% Free
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-2xl leading-relaxed">
                      All video lectures, recorded sessions, handwritten notes, and practice DPPs with PANDEY JI smart player and instant access.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 self-start md:self-auto">
                  <button
                    onClick={() => setShowWhatsAppModal(true)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-xs font-bold text-[#25D366] hover:bg-[#25D366]/30 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Join WhatsApp</span>
                  </button>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold text-stone-300">
                    <GraduationCap className="w-4 h-4 text-[#FACC15]" />
                    <span>126+ Batches</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Tabs Controls */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
              {/* Main Tab buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-[#121212] rounded-xl border border-white/10 shadow-inner">
                <button
                  onClick={() => setActiveTab('latest')}
                  className={`shrink-0 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 btn-click-effect ${
                    activeTab === 'latest'
                      ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#FACC15]" />
                  Latest Batches
                </button>

                <button
                  onClick={() => setActiveTab('enrolled')}
                  className={`shrink-0 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 btn-click-effect ${
                    activeTab === 'enrolled'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  My Enrolled
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      enrolledIds.length > 0 ? 'bg-[#10B981] text-black' : 'bg-white/10 text-stone-400'
                    }`}
                  >
                    {enrolledIds.length}
                  </span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-[380px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-stone-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search batches by name, teacher, exam..."
                  className="w-full bg-[#121212] border border-white/10 text-white text-sm rounded-xl block pl-10 pr-10 py-2.5 transition-all placeholder:text-stone-500 focus:outline-none focus:border-[#FACC15]/60 focus:bg-[#161616]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-white transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Chips (Teachers / Categories) */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scroll pb-2 mb-6 text-xs font-semibold">
              <span className="text-stone-500 text-xs shrink-0 flex items-center gap-1 mr-1">
                <Layers className="w-3.5 h-3.5" /> Filters:
              </span>
              {categoryFilters.map((filter) => {
                const isActive = selectedCategory === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedCategory(filter.value)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg border transition-all btn-click-effect ${
                      isActive
                        ? 'bg-[#FACC15] text-black font-bold border-[#FACC15] shadow-[0_0_12px_rgba(250,204,21,0.25)]'
                        : 'bg-[#121212] text-stone-400 border-white/10 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Batches Grid */}
            {visibleBatches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleBatches.map((batch, index) => {
                  const isEnrolled = enrolledIds.includes(String(batch.id));
                  const tagInfo = getBatchTag(batch.title);

                  return (
                    <div
                      key={batch.id}
                      className="premium-card rounded-2xl overflow-hidden group flex flex-col relative transition-all"
                      style={{ animationDelay: `${(index % 12) * 35}ms` }}
                    >
                      {/* Thumbnail Container */}
                      <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#0c0c0c] border-b border-white/5">
                        {batch.thumbnail ? (
                          <img
                            src={batch.thumbnail}
                            alt={batch.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                            onError={(e) => {
                              const target = e.target as HTMLElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1c1810] to-[#0d0c0c]">
                            <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-xs mb-1">
                              PJ
                            </div>
                            <span className="text-xs text-stone-400 font-medium text-center line-clamp-2">
                              {batch.title}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-90" />

                        {/* FREE Badge */}
                        <div className="absolute top-3 right-3 bg-[#10B981]/20 backdrop-blur-md border border-[#10B981]/30 px-2.5 py-1 rounded-md flex items-center justify-center z-10 shadow-sm">
                          <span className="text-[#10B981] text-[10px] font-black tracking-widest uppercase">
                            FREE
                          </span>
                        </div>

                        {/* Batch ID badge */}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-[10px] text-stone-400 font-mono">
                          #{batch.id}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 flex flex-col flex-1 relative z-20">
                        {/* Educator / Subject Pill */}
                        <div className="mb-2.5 flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border bg-gradient-to-r ${tagInfo.color}`}
                          >
                            {tagInfo.tag}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          className="text-gray-200 font-semibold text-sm leading-relaxed mb-4 line-clamp-2 group-hover:text-white transition-colors"
                          title={batch.title}
                        >
                          {batch.title}
                        </h3>

                        {/* Actions footer */}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5 gap-2">
                          {isEnrolled ? (
                            <button
                              onClick={(e) => toggleEnroll(batch.id, e)}
                              className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider flex items-center gap-1.5 hover:bg-[#10B981]/25 transition-colors btn-click-effect"
                            >
                              <Check className="w-3.5 h-3.5" /> ENROLLED
                            </button>
                          ) : (
                            <button
                              onClick={(e) => toggleEnroll(batch.id, e)}
                              className="bg-[#10B981] hover:bg-emerald-400 text-black px-3.5 py-1.5 rounded-lg text-[11px] font-black tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md"
                            >
                              <Plus className="w-3.5 h-3.5" /> ENROLL
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedBatch(batch)}
                            className="bg-[#FACC15] hover:bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md"
                          >
                            Let&apos;s Study <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-white/5 bg-[#121212]/50 p-8">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                  <FolderOpen className="w-8 h-8 text-stone-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Batches Found</h3>
                <p className="text-stone-400 text-sm max-w-md">
                  {activeTab === 'enrolled'
                    ? "You haven't enrolled in any batches yet. Click 'ENROLL' on any batch in Latest Batches to bookmark it here!"
                    : 'No batches matched your search criteria. Try a different keyword or reset filters.'}
                </p>
                {activeTab === 'enrolled' ? (
                  <button
                    onClick={() => setActiveTab('latest')}
                    className="mt-5 px-5 py-2 rounded-xl bg-[#FACC15] text-black font-bold text-xs uppercase tracking-wider btn-click-effect"
                  >
                    Browse All Batches
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="mt-5 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs btn-click-effect"
                  >
                    Reset Search Filters
                  </button>
                )}
              </div>
            )}

            {/* Load More Button */}
            {visibleBatches.length < filteredBatches.length && (
              <div className="w-full flex justify-center mt-10 mb-6">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-8 py-2.5 bg-[#121212] border border-white/10 hover:border-white/30 rounded-xl text-white font-semibold text-sm transition-all btn-click-effect flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                      Loading batches...
                    </>
                  ) : (
                    <>
                      Load More ({filteredBatches.length - visibleBatches.length} remaining){' '}
                      <ChevronDown className="w-4 h-4 text-[#FACC15]" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Classroom PDF Notes & DPP Modal (Authentic Multi-Page Document) */}
      {viewingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-4xl h-[94vh] bg-[#141414] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3 sm:p-4 bg-[#1a1a1a] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                    {viewingPdf.title}
                  </h3>
                  <span className="text-[10px] text-amber-400 font-semibold block">
                    PANDEY JI Official Class Notes (Target 2026)
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Toggle: Interactive Handout vs Real PDF Document */}
                <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-0.5 text-xs">
                  <button
                    onClick={() => setViewingPdf((prev) => (prev ? { ...prev, viewMode: 'interactive' } : null))}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      viewingPdf.viewMode === 'interactive'
                        ? 'bg-[#10B981] text-black shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Class Handout & DPP
                  </button>
                  <button
                    onClick={() => setViewingPdf((prev) => (prev ? { ...prev, viewMode: 'pdf' } : null))}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      viewingPdf.viewMode === 'pdf'
                        ? 'bg-[#10B981] text-black shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Original PDF Document
                  </button>
                </div>

                {/* Page Navigation (when in interactive mode) */}
                {viewingPdf.viewMode === 'interactive' && (
                  <div className="flex items-center bg-black/60 border border-white/10 rounded-xl px-2 py-1 text-xs">
                    <button
                      onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                      disabled={pdfPage === 1}
                      className="p-1 text-stone-300 hover:text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-mono text-stone-300 font-bold">
                      Page {pdfPage} / 4
                    </span>
                    <button
                      onClick={() => setPdfPage((p) => Math.min(4, p + 1))}
                      disabled={pdfPage === 4}
                      className="p-1 text-stone-300 hover:text-white disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Direct Download Button */}
                <a
                  href={
                    viewingPdf.pdfUrl
                      ? `${viewingPdf.pdfUrl}&download=true`
                      : `/api/pdf?title=${encodeURIComponent(viewingPdf.title)}&course_id=${viewingPdf.courseId}&download=true`
                  }
                  download={`${viewingPdf.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Class_Notes.pdf`}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </a>

                {/* WhatsApp Help */}
                <button
                  onClick={() => setShowWhatsAppModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] text-xs font-bold flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Ask on WA
                </button>

                <button
                  onClick={() => setViewingPdf(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content View: Either Original PDF iframe or Multi-Page Handout */}
            {viewingPdf.viewMode === 'pdf' ? (
              <div className="flex-1 w-full h-full bg-[#1b1b1b] flex flex-col">
                <div className="px-4 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Viewing Official Classroom PDF Stream
                  </span>
                  <a
                    href={
                      viewingPdf.pdfUrl ||
                      `/api/pdf?title=${encodeURIComponent(viewingPdf.title)}&course_id=${viewingPdf.courseId}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#FACC15] hover:underline flex items-center gap-1 font-bold"
                  >
                    Open in Full Window <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <iframe
                  src={
                    viewingPdf.pdfUrl ||
                    `/api/pdf?title=${encodeURIComponent(viewingPdf.title)}&course_id=${viewingPdf.courseId}`
                  }
                  className="w-full flex-1 border-none bg-white min-h-[500px]"
                  title={viewingPdf.title}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0a0a0a] flex justify-center">
              <div className="w-full max-w-3xl bg-[#ffffff] text-[#111111] rounded-2xl shadow-2xl p-6 sm:p-10 font-sans border border-stone-300 text-sm leading-relaxed">
                {/* PDF Document Header */}
                <div className="border-b-2 border-[#111111] pb-4 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-[#FACC15] font-black text-sm">
                      PJ
                    </div>
                    <div>
                      <h1 className="text-lg font-black tracking-wider text-[#111111] font-syne">
                        PANDEY JI • OFFICIAL CLASS NOTES
                      </h1>
                      <p className="text-[11px] text-stone-600 font-semibold">
                        Exclusive Exam Preparation & Classroom Handouts
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded">
                      Batch #{viewingPdf.courseId}
                    </span>
                    <p className="text-[10px] text-stone-500 font-mono mt-1">2026 Syllabus</p>
                  </div>
                </div>

                {/* Topic Title */}
                <div className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-0.5">
                    LECTURE TOPIC & HANDOUT
                  </span>
                  <h2 className="text-base sm:text-xl font-black text-stone-900">{viewingPdf.title}</h2>
                </div>

                {/* PAGE 1: Foundations, Key Rules & Framework */}
                {pdfPage === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide border-b border-stone-200 pb-1 mb-3">
                        SECTION 1: CORE CLASS CONCEPTS & METHODOLOGIES
                      </h3>
                      <div className="space-y-3 text-stone-800 text-[13px]">
                        <p>
                          <strong>Concept Overview:</strong> In this lecture, we focus on identifying root anchors and establishing structured step-by-step algorithms to solve questions with 100% accuracy in minimum time.
                        </p>
                        <div className="p-3 bg-amber-50/60 border-l-4 border-amber-500 rounded-r-lg space-y-1.5">
                          <p className="font-bold text-amber-900 text-xs uppercase tracking-wide">
                            GOLDEN RULE #01: THE INDEPENDENT OPENER LAW
                          </p>
                          <p className="text-xs text-stone-700">
                            A primary starting statement introduces a fresh noun and full subject title. Avoid starting with pronouns (<em>he, she, they, this, these</em>) or concluding discourse markers (<em>therefore, hence, conversely</em>).
                          </p>
                        </div>
                        <div className="p-3 bg-emerald-50/60 border-l-4 border-emerald-500 rounded-r-lg space-y-1.5">
                          <p className="font-bold text-emerald-900 text-xs uppercase tracking-wide">
                            GOLDEN RULE #02: MANDATORY PAIRING & CONNECTOR LOGIC
                          </p>
                          <p className="text-xs text-stone-700">
                            Search for Cause & Effect relationships, chronologies (years, dates), acronym expansions (e.g. Reserve Bank of India first, then RBI), and transition words (<em>however, moreover, in addition</em>).
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide border-b border-stone-200 pb-1 mb-3">
                        SECTION 2: ELIMINATION HACK FOR 30-SECOND ANSWERS
                      </h3>
                      <p className="text-[13px] text-stone-800">
                        When looking at option choices:
                      </p>
                      <ul className="list-disc list-inside text-xs text-stone-700 space-y-1.5 mt-2 pl-2">
                        <li>Look at the first letter of all options (e.g., if options start with B, C, B, E &rarr; first test B).</li>
                        <li>Verify the mandatory pair. If pair <strong>CD</strong> is established, immediately eliminate any choice where C does not directly precede D.</li>
                        <li>Never re-read the entire passage 5 times; trust the structural pair linkage.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* PAGE 2: Classroom Solved Examples */}
                {pdfPage === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide border-b border-stone-200 pb-1 mb-3">
                        SECTION 3: CLASSROOM SOLVED EXAMPLES (FACULTY WALKTHROUGH)
                      </h3>

                      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 mb-4">
                        <p className="font-bold text-stone-900 text-xs">
                          Example 01 (Prelims Standard): Rearrange the statements into a coherent paragraph.
                        </p>
                        <div className="text-xs text-stone-700 space-y-1 font-mono bg-white p-3 rounded border border-stone-200">
                          <p><strong>A.</strong> This surge in inflation has severely pressured household budgets across rural regions.</p>
                          <p><strong>B.</strong> Over the past two quarters, food commodities have experienced an unprecedented price hike.</p>
                          <p><strong>C.</strong> Consequently, central banks are considering tightening liquidity measures.</p>
                          <p><strong>D.</strong> Such policy interventions aim to restore macroeconomic stability in the medium term.</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950">
                          <p className="font-bold">Faculty Solution & Step-by-Step Breakdown:</p>
                          <p className="mt-1">
                            1. Sentence <strong>B</strong> is independent (introduces food commodity price hike).<br />
                            2. Sentence <strong>A</strong> refers to <em>&ldquo;This surge&rdquo;</em> (links directly to B &rarr; Pair <strong>BA</strong>).<br />
                            3. Sentence <strong>C</strong> notes the outcome (<em>&ldquo;Consequently...&rdquo;</em>).<br />
                            4. Sentence <strong>D</strong> refers to <em>&ldquo;Such policy interventions&rdquo;</em> (links to central bank measures in C &rarr; Pair <strong>CD</strong>).<br />
                            <strong>Correct Sequence: B &rarr; A &rarr; C &rarr; D.</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAGE 3: Daily Practice Problems (DPP) */}
                {pdfPage === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide border-b border-stone-200 pb-1 mb-3">
                        SECTION 4: DAILY PRACTICE PROBLEMS (DPP SET)
                      </h3>

                      <div className="space-y-4">
                        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                          <p className="font-bold text-stone-900 text-xs">
                            Q1. Which of the following sentences cannot be the opening sentence of a paragraph?
                          </p>
                          <p className="text-xs text-stone-700">
                            (A) The Indian economy displayed remarkable resilience amidst global headwinds.<br />
                            (B) These initiatives, however, faced severe logistical challenges in urban hubs.<br />
                            (C) Renewable energy investments grew by 24% over the preceding fiscal cycle.<br />
                            (D) Artificial Intelligence continues to transform modern retail architectures.
                          </p>
                          <p className="text-[11px] font-bold text-emerald-700 pt-1 border-t border-stone-200">
                            Ans: (B) &mdash; Presence of demonstrative &ldquo;These initiatives&rdquo; and transition &ldquo;however&rdquo;.
                          </p>
                        </div>

                        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                          <p className="font-bold text-stone-900 text-xs">
                            Q2. In a quantitative data caselet, if ratio of Boys to Girls is 7:5 and total students are 840, find the number of girls.
                          </p>
                          <p className="text-xs text-stone-700">
                            Total parts = 7 + 5 = 12 parts.<br />
                            1 part = 840 / 12 = 70.<br />
                            Number of girls = 5 &times; 70 = <strong>350 Girls</strong>.
                          </p>
                        </div>

                        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                          <p className="font-bold text-stone-900 text-xs">
                            Q3. Syllogism: Statement: &ldquo;Only a few apples are mangoes. All mangoes are sweet.&rdquo; Conclusion: &ldquo;Some apples are definitely not sweet.&rdquo; Does it follow?
                          </p>
                          <p className="text-xs text-stone-700">
                            Ans: Does not follow definitely (It is only a possibility, not a certain negative across all subsets).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAGE 4: Important Formula & Vocabulary Cheat Sheet */}
                {pdfPage === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide border-b border-stone-200 pb-1 mb-3">
                        SECTION 5: HIGH-FREQUENCY EXAM CHEAT SHEET
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                          <p className="font-black text-stone-900 text-xs uppercase tracking-wide text-amber-700">
                            QUANT SHORTCUT FRACTIONS
                          </p>
                          <ul className="text-xs font-mono space-y-1 text-stone-800">
                            <li>1/6 = 16.66% &bull; 1/7 = 14.28%</li>
                            <li>1/8 = 12.50% &bull; 1/9 = 11.11%</li>
                            <li>1/11 = 9.09% &bull; 1/12 = 8.33%</li>
                            <li>1/13 = 7.69% &bull; 1/14 = 7.14%</li>
                          </ul>
                        </div>

                        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                          <p className="font-black text-stone-900 text-xs uppercase tracking-wide text-emerald-700">
                            HIGH-YIELD VOCABULARY
                          </p>
                          <ul className="text-xs space-y-1 text-stone-800">
                            <li><strong>Exacerbate:</strong> To worsen a problem</li>
                            <li><strong>Mitigate:</strong> To lessen the severity</li>
                            <li><strong>Spurious:</strong> False, bogus or invalid</li>
                            <li><strong>Tenacious:</strong> Persistent, determined</li>
                          </ul>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-950 mt-4 text-center">
                        <p className="font-bold">
                          Join the Official PANDEY JI WhatsApp Channel for daily PDF handouts and test solutions!
                        </p>
                        <button
                          onClick={openWhatsApp}
                          className="mt-2.5 px-4 py-1.5 rounded-lg bg-[#25D366] text-black font-black uppercase text-xs tracking-wider inline-flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Join WhatsApp Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF Document Footer */}
                <div className="border-t border-stone-300 pt-4 mt-8 flex items-center justify-between text-[11px] text-stone-500">
                  <span>Page {pdfPage} of 4 &bull; PANDEY JI Verified Handout</span>
                  <span>Free Education Portal &bull; All Rights Reserved</span>
                </div>
              </div>
            </div>
            )}

            {/* Modal Footer */}
            <div className="p-3 bg-[#1a1a1a] border-t border-white/10 flex items-center justify-between text-xs text-stone-400">
              {viewingPdf.viewMode === 'interactive' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                    disabled={pdfPage === 1}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPdfPage((p) => Math.min(4, p + 1))}
                    disabled={pdfPage === 4}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
                  >
                    Next Page
                  </button>
                </div>
              ) : (
                <span className="text-stone-400">Official Classroom Document</span>
              )}

              <button
                onClick={() => setViewingPdf(null)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-[#070707] py-8 mt-auto">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-[#F59E0B] via-[#FACC15] to-[#fef08a] overflow-hidden">
              <img
                src={PROFILE_PHOTO_URL}
                alt="PANDEY JI"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <span className="font-black text-white font-syne tracking-wide">
                PANDEY <span className="text-[#FACC15]">JI</span>
              </span>
              <p className="text-[11px] text-stone-500">Free Education & Premium Batches Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-stone-400">
            <button onClick={() => setShowWhatsAppModal(true)} className="text-[#25D366] hover:underline flex items-center gap-1 font-bold">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Channel
            </button>
            <button
              onClick={() => {
                setActiveTab('latest');
                setSelectedBatch(null);
                setActiveVideo(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              All Batches
            </button>
            <button
              onClick={() => {
                setActiveTab('enrolled');
                setSelectedBatch(null);
                setActiveVideo(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              My Enrollments ({enrolledIds.length})
            </button>
          </div>

          <p>© {new Date().getFullYear()} PANDEY JI. Free for all aspirants.</p>
        </div>
      </footer>
    </div>
  );
}
