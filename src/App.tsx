import { Shell } from './components/Shell';
import { useRoute } from './router';
import { Lab } from './pages/Lab';
import { Level } from './pages/Level';
import { LevelMap } from './pages/LevelMap';

export function App() {
  const route = useRoute();

  return (
    <Shell route={route}>
      {route.name === 'lab' && <Lab />}
      {route.name === 'level' && <Level id={route.id} />}
      {(route.name === 'levels' || route.name === 'landing') && <LevelMap />}
      {route.name === 'sandbox' && <LevelMap />}
      {route.name === 'how' && <LevelMap />}
    </Shell>
  );
}
