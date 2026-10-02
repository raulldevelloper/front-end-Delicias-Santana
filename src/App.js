import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DeliciasSantanaApp from './DeliciasSantanaApp';
import PainelAdminApp from './PainelAdminApp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeliciasSantanaApp />} />
        <Route path="/admin" element={<PainelAdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;