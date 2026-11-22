import { useAuth } from '../../App.jsx';
import Header from './Header.jsx';
import Hero from './Hero.jsx';
import Occasions from './Occasions.jsx';
import HowItWorks from './HowItWorks.jsx';
import ClosingCta from './ClosingCta.jsx';
import Footer from './Footer.jsx';
import './landing.css';

export default function LandingPage() {
  const { user } = useAuth();
  const startPath = user ? '/events/new' : '/signup';
  return (
    <div className="lp">
      <Header />
      <Hero startPath={startPath} />
      <Occasions startPath={startPath} signedIn={!!user} />
      <HowItWorks />
      <ClosingCta startPath={startPath} />
      <Footer />
    </div>
  );
}
