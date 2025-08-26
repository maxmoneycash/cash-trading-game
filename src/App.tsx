import CandlestickChart from './components/CandlestickChart'
import GameManagerTest from './components/GameManagerTest'

function App() {
  // Default to original game, only show test interface with ?test=true
  const showTest = new URLSearchParams(window.location.search).get('test') === 'true';
  
  if (showTest) {
    return <GameManagerTest />
  }
  
  // Original game with hold-to-buy mechanics
  return <CandlestickChart />
}

export default App
