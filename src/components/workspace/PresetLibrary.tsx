import React, { useState } from "react";
import { X, Camera, Palette, Sparkles, Wand2, Crown, Shirt, Mountain, Building2, Heart, Star, Zap, Gem, Sun, Moon, Flower2, Image, Video, Clapperboard, Film, Play, Tv, Rocket, Wind, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PresetItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
}

interface PresetCategory {
  id: string;
  name: string;
  items: PresetItem[];
}

type MediaType = "image" | "video";

const useImageCategories = (): PresetCategory[] => {
  const { t } = useTranslation();
  return [
    {
      id: "professional",
      name: t("presets.professional"),
      items: [
        { id: "corporate", name: t("presets.corporate"), description: t("presets.corporateDesc"), icon: <Building2 className="w-6 h-6" />, prompt: "Professional corporate headshot, neutral background, soft lighting, business attire, confident expression", color: "bg-accent-yellow" },
        { id: "linkedin", name: t("presets.linkedin"), description: t("presets.linkedinDesc"), icon: <Crown className="w-6 h-6" />, prompt: "LinkedIn profile photo, professional appearance, warm smile, clean background, approachable demeanor", color: "bg-accent-yellow" },
        { id: "executive", name: t("presets.executive"), description: t("presets.executiveDesc"), icon: <Star className="w-6 h-6" />, prompt: "Executive portrait, premium lighting, sophisticated backdrop, power pose, high-end corporate look", color: "bg-accent-yellow" },
        { id: "academic", name: t("presets.academic"), description: t("presets.academicDesc"), icon: <Gem className="w-6 h-6" />, prompt: "Academic portrait, library or study setting, intellectual aura, scholarly attire, thoughtful expression", color: "bg-accent-yellow" },
      ]
    },
    {
      id: "casual",
      name: t("presets.casualArt"),
      items: [
        { id: "outdoor", name: t("presets.outdoor"), description: t("presets.outdoorDesc"), icon: <Mountain className="w-6 h-6" />, prompt: "Outdoor casual portrait, golden hour lighting, natural scenery background, relaxed pose, authentic expression", color: "bg-accent-yellow" },
        { id: "artistic", name: t("presets.artistic"), description: t("presets.artisticDesc"), icon: <Palette className="w-6 h-6" />, prompt: "Artistic portrait, creative lighting, abstract background, expressive pose, unique artistic vision", color: "bg-accent-yellow" },
        { id: "lifestyle", name: t("presets.lifestyle"), description: t("presets.lifestyleDesc"), icon: <Heart className="w-6 h-6" />, prompt: "Lifestyle photography, candid moment, warm tones, cozy setting, genuine emotions", color: "bg-accent-yellow" },
        { id: "vintage", name: t("presets.vintage"), description: t("presets.vintageDesc"), icon: <Sun className="w-6 h-6" />, prompt: "Vintage style portrait, film grain effect, muted colors, retro fashion, nostalgic atmosphere", color: "bg-accent-yellow" },
      ]
    },
    {
      id: "fashion",
      name: t("presets.fashion"),
      items: [
        { id: "editorial", name: t("presets.editorial"), description: t("presets.editorialDesc"), icon: <Sparkles className="w-6 h-6" />, prompt: "High fashion editorial, dramatic lighting, bold styling, avant-garde pose, magazine cover quality", color: "bg-accent-yellow" },
        { id: "streetwear", name: t("presets.streetwear"), description: t("presets.streetwearDesc"), icon: <Shirt className="w-6 h-6" />, prompt: "Streetwear fashion shoot, urban backdrop, trendy outfit, dynamic pose, contemporary style", color: "bg-accent-yellow" },
        { id: "glamour", name: t("presets.glamour"), description: t("presets.glamourDesc"), icon: <Crown className="w-6 h-6" />, prompt: "Glamour photography, studio lighting, elegant styling, sophisticated pose, luxury atmosphere", color: "bg-accent-yellow" },
        { id: "runway", name: t("presets.runway"), description: t("presets.runwayDesc"), icon: <Zap className="w-6 h-6" />, prompt: "Runway inspired shot, high contrast lighting, designer fashion, model pose, fashion week aesthetic", color: "bg-accent-yellow" },
      ]
    },
    {
      id: "magic",
      name: t("presets.magicTools"),
      items: [
        { id: "cyberpunk", name: t("presets.cyberpunk"), description: t("presets.cyberpunkDesc"), icon: <Building2 className="w-6 h-6" />, prompt: "Cyberpunk aesthetic, neon lights, rain-soaked streets, futuristic cityscape, high-tech low-life atmosphere", color: "bg-accent-yellow" },
        { id: "fantasy", name: t("presets.fantasy"), description: t("presets.fantasyDesc"), icon: <Wand2 className="w-6 h-6" />, prompt: "Fantasy portrait, magical elements, ethereal lighting, enchanted setting, mystical atmosphere", color: "bg-accent-yellow" },
        { id: "anime", name: t("presets.anime"), description: t("presets.animeDesc"), icon: <Flower2 className="w-6 h-6" />, prompt: "Anime style portrait, vibrant colors, expressive eyes, dynamic composition, Japanese animation aesthetic", color: "bg-accent-yellow" },
        { id: "scifi", name: t("presets.scifi"), description: t("presets.scifiDesc"), icon: <Moon className="w-6 h-6" />, prompt: "Sci-fi portrait, holographic elements, futuristic technology, space setting, advanced civilization aesthetic", color: "bg-accent-yellow" },
      ]
    },
  ];
};

const useVideoCategories = (): PresetCategory[] => {
  const { t } = useTranslation();
  return [
    {
      id: "cinematic",
      name: t("presets.cinematic"),
      items: [
        { id: "hollywood", name: t("presets.hollywood"), description: t("presets.hollywoodDesc"), icon: <Clapperboard className="w-6 h-6" />, prompt: "Cinematic Hollywood style, 24fps, anamorphic lens flare, dramatic lighting, movie-grade color grading, epic atmosphere", color: "bg-accent-yellow" },
        { id: "noir", name: t("presets.noir"), description: t("presets.noirDesc"), icon: <Film className="w-6 h-6" />, prompt: "Film noir aesthetic, high contrast black and white, venetian blind shadows, smoky atmosphere, mysterious mood, slow dolly movement", color: "bg-accent-yellow" },
        { id: "arthouse", name: t("presets.arthouse"), description: t("presets.arthouseDesc"), icon: <Camera className="w-6 h-6" />, prompt: "Arthouse cinema style, natural lighting, long takes, contemplative pacing, intimate framing, subtle camera movement", color: "bg-accent-yellow" },
        { id: "documentary", name: t("presets.documentary"), description: t("presets.documentaryDesc"), icon: <Tv className="w-6 h-6" />, prompt: "Documentary style, handheld camera, natural environment, authentic moments, observational approach, real-life atmosphere", color: "bg-accent-yellow" },
      ]
    },
    {
      id: "motion",
      name: t("presets.motionFx"),
      items: [
        { id: "slowmo", name: t("presets.slowmo"), description: t("presets.slowmoDesc"), icon: <Play className="w-6 h-6" />, prompt: "Slow motion capture, 120fps, dramatic time stretch, detailed motion blur, epic moment freeze, cinematic impact", color: "bg-accent-yellow" },
        { id: "timelapse", name: t("presets.timelapse"), description: t("presets.timelapseDesc"), icon: <Zap className="w-6 h-6" />, prompt: "Timelapse video, accelerated motion, day-to-night transition, cloud movement, urban life flow, hypnotic rhythm", color: "bg-accent-yellow" },
        { id: "drone", name: t("presets.aerial"), description: t("presets.aerialDesc"), icon: <Rocket className="w-6 h-6" />, prompt: "Aerial drone footage, sweeping landscape views, smooth gimbal movement, reveal shots, epic scale, breathtaking vistas", color: "bg-accent-yellow" },
        { id: "tracking", name: t("presets.tracking"), description: t("presets.trackingDesc"), icon: <Wind className="w-6 h-6" />, prompt: "Dynamic tracking shot, smooth follow movement, subject-centered framing, energetic pace, immersive perspective", color: "bg-accent-yellow" },
      ]
    },
    {
      id: "atmosphere",
      name: t("presets.atmosphere"),
      items: [
        { id: "nature", name: t("presets.nature"), description: t("presets.natureDesc"), icon: <Mountain className="w-6 h-6" />, prompt: "Nature documentary style, pristine wilderness, golden hour lighting, gentle camera movement, serene atmosphere, wildlife moments", color: "bg-accent-yellow" },
        { id: "urban", name: t("presets.urban"), description: t("presets.urbanDesc"), icon: <Building2 className="w-6 h-6" />, prompt: "Urban cityscape, neon lights reflection, street life movement, night city atmosphere, dynamic energy, modern architecture", color: "bg-accent-yellow" },
        { id: "ocean", name: t("presets.oceanic"), description: t("presets.oceanicDesc"), icon: <Waves className="w-6 h-6" />, prompt: "Underwater footage, crystal clear water, marine life, gentle current movement, blue color palette, peaceful diving atmosphere", color: "bg-accent-yellow" },
        { id: "cosmic", name: t("presets.cosmic"), description: t("presets.cosmicDesc"), icon: <Moon className="w-6 h-6" />, prompt: "Space visualization, starfield background, nebula colors, planetary orbit, cosmic scale, science fiction atmosphere", color: "bg-accent-yellow" },
      ]
    },
    {
      id: "creative",
      name: t("presets.creative"),
      items: [
        { id: "anime-vid", name: t("presets.animeVid"), description: t("presets.animeVidDesc"), icon: <Flower2 className="w-6 h-6" />, prompt: "Anime style animation, vibrant colors, expressive characters, dynamic action sequences, Japanese animation aesthetic, cel-shaded look", color: "bg-accent-yellow" },
        { id: "retro-vid", name: t("presets.retroVhs"), description: t("presets.retroVhsDesc"), icon: <Tv className="w-6 h-6" />, prompt: "VHS retro aesthetic, scan lines, tracking glitches, vintage color bleeding, nostalgic 80s feel, lo-fi charm", color: "bg-accent-yellow" },
        { id: "glitch", name: t("presets.glitchArt"), description: t("presets.glitchArtDesc"), icon: <Zap className="w-6 h-6" />, prompt: "Glitch art video, data corruption effects, RGB split, digital artifacts, cyberpunk aesthetic, experimental visuals", color: "bg-accent-yellow" },
        { id: "dreamy", name: t("presets.dreamlike"), description: t("presets.dreamlikeDesc"), icon: <Sparkles className="w-6 h-6" />, prompt: "Dreamlike sequence, soft focus, ethereal glow, floating elements, surreal transitions, otherworldly atmosphere", color: "bg-accent-yellow" },
      ]
    },
  ];
};

interface PresetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (prompt: string) => void;
}

const PresetLibrary: React.FC<PresetLibraryProps> = ({ isOpen, onClose, onSelectPreset }) => {
  const { t } = useTranslation();
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const imageCategories = useImageCategories();
  const videoCategories = useVideoCategories();
  const categories = mediaType === "image" ? imageCategories : videoCategories;
  const [activeCategory, setActiveCategory] = useState(categories[0].id);

  const handleMediaTypeChange = (type: MediaType) => {
    setMediaType(type);
    const newCategories = type === "image" ? imageCategories : videoCategories;
    setActiveCategory(newCategories[0].id);
  };

  if (!isOpen) return null;

  const currentCategory = categories.find(cat => cat.id === activeCategory);

  return (
    <div className="absolute inset-0 bg-foreground/95 z-30 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b-brutal border-card/30">
        <h2 className="font-mono font-bold text-sm text-card tracking-widest">// {t("intelligenceHub.promptArsenal")}</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-card hover:bg-card/20 transition-none">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-card/20">
        <button
          onClick={() => handleMediaTypeChange("image")}
          className={cn(
            "flex-1 py-3 font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-none",
            mediaType === "image" ? "bg-accent-cyan text-foreground" : "bg-transparent text-card/70 hover:text-card hover:bg-card/10"
          )}
        >
          <Image className="w-4 h-4" />
          {t("intelligenceHub.imagePrompts")}
        </button>
        <button
          onClick={() => handleMediaTypeChange("video")}
          className={cn(
            "flex-1 py-3 font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-none border-l border-card/20",
            mediaType === "video" ? "bg-accent-pink text-foreground" : "bg-transparent text-card/70 hover:text-card hover:bg-card/10"
          )}
        >
          <Video className="w-4 h-4" />
          {t("intelligenceHub.videoPrompts")}
        </button>
      </div>

      <div className="flex gap-1 p-3 border-b border-card/20 overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              "px-4 py-2 font-mono font-bold text-xs uppercase whitespace-nowrap transition-none border-brutal",
              activeCategory === category.id ? "bg-accent-pink text-foreground border-accent-pink" : "bg-transparent text-card border-card/30 hover:bg-card/10"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {currentCategory?.items.map((item) => (
            <button
              key={item.id}
              onClick={() => { onSelectPreset(item.prompt); onClose(); }}
              className="group flex flex-col border-brutal border-card/30 bg-card/5 hover:bg-card/15 transition-none brutal-press"
            >
              <div className={cn("aspect-square flex items-center justify-center", item.color)}>
                <div className="text-card transform group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
              </div>
              <div className="p-3 text-left bg-foreground">
                <div className="font-mono font-bold text-xs text-card uppercase tracking-wide">{item.name}</div>
                <div className="font-mono text-[10px] text-card/70 mt-0.5">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-card/20">
        <p className="text-center font-mono text-[10px] text-card/50">
          {t("intelligenceHub.clickPreset")} · {t("intelligenceHub.presetsAvailable", { count: currentCategory?.items.length })}
        </p>
      </div>
    </div>
  );
};

export { PresetLibrary };
