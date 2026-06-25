import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Eleves from './pages/Eleves'
import Classes from './pages/Classes'
import Options from './pages/Options'
import Cours from './pages/Cours'
import Presence from './pages/Presence'
import AnneesScolaires from './pages/AnneesScolaires'
import Inscriptions from './pages/Inscriptions'
import Cotations from './pages/Cotations'
import Frais from './pages/Frais'
import Paiements from './pages/Paiements'
import Rapports from './pages/Rapports'
import Parametres from './pages/Parametres'
import Parents from './pages/Parents'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/parents" element={<Parents />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/eleves" element={<Eleves />} />
      <Route path="/classes" element={<Classes />} />
      <Route path="/options" element={<Options />} />
      <Route path="/cours" element={<Cours />} />
      <Route path="/presence" element={<Presence />} />
      <Route path="/annees-scolaires" element={<AnneesScolaires />} />
      <Route path="/inscriptions" element={<Inscriptions />} />
      <Route path="/cotations" element={<Cotations />} />
      <Route path="/frais" element={<Frais />} />
      <Route path="/paiements" element={<Paiements />} />
      <Route path="/rapports" element={<Rapports />} />
      <Route path="/parametres" element={<Parametres />} />
    </Routes>
  )
}
