import { SearchForm, SearchData } from "@/components/SearchForm";
import heroImage from "@/assets/hero-car.jpg";
import { useTranslation } from "react-i18next";

interface HeroProps {
  onSearch: (searchData: SearchData) => void;
}

export const Hero = ({ onSearch }: HeroProps) => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-[90vh] flex items-center pt-24 pb-12 overflow-hidden">
      {/* Background with advanced gradient and pattern */}
      <div className="absolute inset-0 bg-[#f8fafc] z-0">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-white to-transparent" />
        
        {/* Abstract shapes for premium feel */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full px-6">
        <div className="flex flex-col items-center">
          <div className="w-full text-center mb-16 space-y-8">


            <h1 className="text-[32px] font-bold text-slate-900 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {t('hero.title.line1')}
              <span className="block italic text-blue-600 bg-clip-text bg-[var(--accent-gradient)] font-extrabold">
                {t('hero.title.line2')}
              </span>
            </h1>

            <p className="text-[14px] font-normal text-slate-500 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
              {t('hero.subtitle')}
            </p>
          </div>
          
          {/* Search Form Integration */}
          <div className="w-full animate-in fade-in zoom-in-95 duration-1000 delay-300">
             <div className="relative">
                {/* Decorative glow behind search form */}
                <div className="absolute -inset-4 bg-blue-600/5 blur-2xl rounded-[3rem] -z-10" />
                <SearchForm onSearch={onSearch} />
             </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
             <div className="flex items-center gap-2 font-bold italic text-lg tracking-tight text-slate-900">ROYAL <span className="text-blue-600">TRUST</span></div>
             <div className="flex items-center gap-2 font-bold italic text-lg tracking-tight text-slate-900">LUXURY <span className="text-blue-600">DRIVE</span></div>
             <div className="flex items-center gap-2 font-bold italic text-lg tracking-tight text-slate-900">SAFE <span className="text-blue-600">RIDE</span></div>
          </div>
        </div>
      </div>
    </section>
  );
};