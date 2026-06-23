import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { CardView } from '../components/CardView';
import { tarotCards } from '../data/cards';
import type { AppView, ReadingResult } from '../types';

interface HomePageProps {
  latest?: ReadingResult;
  onNavigate: (view: AppView) => void;
  onOpenLatest: (reading: ReadingResult) => void;
}

export function HomePage({ latest, onNavigate, onOpenLatest }: HomePageProps) {
  return (
    <main className="screen home-screen">
      <section className="hero-panel">
        <div className="hero-copy">
          <h1>塔罗占卜</h1>
          <p>选择一个明确类别，洗牌、切牌、抽牌，得到一次可复盘的本地占卜结果。</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => onNavigate('reading')}>
              <Sparkles size={18} />
              开始占卜
            </button>
            <button className="ghost-button" type="button" onClick={() => onNavigate('library')}>
              查看牌库
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="hero-deck" aria-hidden="true">
          <CardView card={tarotCards[2]} loading="eager" />
          <CardView card={tarotCards[17]} loading="eager" />
          <CardView card={tarotCards[10]} loading="eager" />
        </div>
      </section>

      <section className="recent-panel">
        <div>
          <h2>最近一次占卜</h2>
          {latest ? (
            <p>{latest.question}</p>
          ) : (
            <p>还没有保存记录。完成一次占卜后，这里会显示最近的问题与结果。</p>
          )}
        </div>
        {latest ? (
          <button className="secondary-button" type="button" onClick={() => onOpenLatest(latest)}>
            <Clock3 size={18} />
            打开结果
          </button>
        ) : (
          <button className="secondary-button" type="button" onClick={() => onNavigate('reading')}>
            立即开始
          </button>
        )}
      </section>
    </main>
  );
}
