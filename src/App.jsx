import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Result from './pages/Result'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'

function Nav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <nav>
      <div className="nav-inner">
        <span className="nav-brand" onClick={() => navigate('/')}>📝 考試網站</span>
        <span className={`nav-link${pathname === '/' ? ' active' : ''}`} onClick={() => navigate('/')}>測驗列表</span>
        <span className={`nav-link${pathname === '/admin' ? ' active' : ''}`} onClick={() => navigate('/admin')}>管理後台</span>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/"                       element={<Home />} />
        <Route path="/quiz/:id"               element={<Quiz />} />
        <Route path="/result"                 element={<Result />} />
        <Route path="/leaderboard/:id"        element={<Leaderboard />} />
        <Route path="/admin"                  element={<Admin />} />
      </Routes>
    </>
  )
}
