import { Shell } from './components/Shell';
import { useRoute } from './router';
import { Lab } from './pages/Lab';

export function App() {
  const route = useRoute();

  return (
    <Shell route={route}>
      {route.name === 'lab' ? <Lab /> : <Lab />}
    </Shell>
  );
}
