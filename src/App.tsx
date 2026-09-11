import { Shell } from './components/Shell';
import { useRoute } from './router';
import { Level } from './pages/Level';
import { LevelMap } from './pages/LevelMap';
import { Landing } from './pages/Landing';
import { Sandbox } from './pages/Sandbox';
import { HowItWorks } from './pages/HowItWorks';

export function App() {
  const route = useRoute();

  return (
    <Shell route={route}>
      {route.name === 'landing' && <Landing />}
      {route.name === 'levels' && <LevelMap />}
      {route.name === 'level' && <Level id={route.id} />}
      {route.name === 'sandbox' && <Sandbox />}
      {route.name === 'how' && <HowItWorks />}
    </Shell>
  );
}
