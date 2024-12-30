import { Routes, Route } from 'react-router-dom'
import Landing_page from './pages/landing_page.jsx'
import TreeVisualization from './pages/TreeVisualization.jsx'
import SinglePage from './pages/SinglePage.jsx'



function App() {
  return (

        <Routes>
            
          <Route path="/" element={< Landing_page />} />
          <Route path="/:owner/:repo/:branch" element={< TreeVisualization />} />
          <Route path="/singlepage" element={< SinglePage />} />
        </Routes>
      
     
  )
}


export default App