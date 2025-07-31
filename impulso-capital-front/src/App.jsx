import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Aside from './components/Aside';
import Content from './components/Content';
import Footer from './components/Footer';
import Login from './components/Login';
import UsersList from './components/UsersList';
import UserAdd from './components/UserAdd';
import UserView from './components/UserView';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Inscription from './components/Inscription';
import ListTables from './components/ListTables';
import UserAddTable from './components/UserAddTable';
import DynamicTableList from './components/DynamicTableList';
import DynamicRecordEdit from './components/DynamicRecordEdit';
import DownloadZip from './components/DownloadZip';
import ProviderTableList from './components/ProviderTableList';
import ProviderKitTableList from './components/ProviderKitTableList';
import PiTableList from './components/PiTableList';
import PlanDeInversion from './components/PlanDeInversion';
import PublicRecordCreate from './components/PublicRecordCreate'; // Importar el componente PublicRecordCreate
import DescargaMasiva from './components/DescargaMasiva';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Ruta para /uploads que permite que el navegador maneje la solicitud */}
        <Route path="/uploads/*" element={null} />

        {/* Ruta pública para crear un registro */}
        <Route path="/table/:tableName/create-record" element={<PublicRecordCreate />} />

        {/* Rutas privadas */}
        <Route
          path="/escritorio"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <Content />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <UsersList />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        <Route
          path="/usuarios/agregar"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <UserAdd />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        <Route
          path="/usuarios/:id"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <UserView />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Ruta para el Módulo de Inscripción */}
        <Route
          path="/inscription"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <Inscription />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Ruta para Listar Tablas */}
        <Route
          path="/list-tables"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <ListTables />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Ruta para agregar tablas */}
        <Route
          path="/inscriptions/create-table"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <UserAddTable />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Ruta para listar las tablas dinámicas */}
        <Route
          path="/dynamic-tables"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <DynamicTableList />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Ruta para ver registros de una tabla específica */}
        <Route
          path="/table/:tableName"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <DynamicTableList />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Ruta para editar un registro específico */}
        <Route
          path="/table/:tableName/record/:recordId"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <DynamicRecordEdit />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Nueva Ruta para las tablas de proveedores */}
        <Route
          path="/provider-tables"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <ProviderTableList />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Nueva Ruta para las tablas de proveedores de kits */}
        <Route
          path="/provider-kit-tables"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <ProviderKitTableList />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Nueva Ruta para las tablas de Plan de Inversión */}
        <Route
          path="/pi-tables"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <PiTableList />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Ruta para Plan de Inversión con pestañas */}
        <Route
          path="/plan-inversion/:id"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <PlanDeInversion />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Nueva Ruta para la Descarga Masiva */}
        <Route
          path="/descarga-masiva"
          element={
            <PrivateRoute>
              <div className="wrapper">
                <Header />
                <Aside />
                <div className="content-wrapper">
                  <DescargaMasiva />
                </div>
                <Footer />
              </div>
            </PrivateRoute>
          }
        />

        {/* Ruta catch-all para redirigir al login si no se encuentra la ruta */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}


