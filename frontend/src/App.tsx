import { Route, Routes } from 'react-router-dom'
import './App.css'
import { useAuth } from './auth/AuthContext'
import { Header } from './components/Header'
import { RequireAuth } from './components/RequireAuth'
import { CartPage } from './pages/CartPage'
import { LoginPage } from './pages/LoginPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'

function App() {
  const { loading } = useAuth()

  // 起動時の認証復元が終わるまで待つ（チラつき防止）。
  if (loading) return <div className="app">読み込み中…</div>

  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<ProductsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/cart"
          element={
            <RequireAuth>
              <CartPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  )
}

export default App
