import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import Home from './views/Home';
import Room from './views/Room';
import RoundHistory from './views/RoundHistory';

function App() {
  return (
    <RoomProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room" element={<Room />} />
          <Route path="/history" element={<RoundHistory />} />
        </Routes>
      </Router>
    </RoomProvider>
  );
}

export default App
