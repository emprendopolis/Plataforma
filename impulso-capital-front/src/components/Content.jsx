import { useEffect } from 'react';

export default function Content() {
  useEffect(() => {
    // Agregar event listeners pasivos
    const addPassiveListeners = () => {
      const options = {
        passive: true
      };

      document.addEventListener('touchstart', () => {}, options);
      document.addEventListener('touchmove', () => {}, options);
      document.addEventListener('wheel', () => {}, options);
      document.addEventListener('scroll', () => {}, options);
    };

    addPassiveListeners();

    // Limpiar event listeners al desmontar
    return () => {
      document.removeEventListener('touchstart', () => {});
      document.removeEventListener('touchmove', () => {});
      document.removeEventListener('wheel', () => {});
      document.removeEventListener('scroll', () => {});
    };
  }, []);

  return (
    <div className="content-wrapper">
      {/* Content Header (Page header) */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Escritorio</h1>
            </div>
          </div>
        </div>{/* /.container-fluid */}
      </section>
      
      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              {/* Default box */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Estadísticas</h3>
                  <div className="card-tools">
                    <button type="button" className="btn btn-tool" data-card-widget="collapse" title="Collapse">
                      <i className="fas fa-minus" />
                    </button>
                    <button type="button" className="btn btn-tool" data-card-widget="remove" title="Remove">
                      <i className="fas fa-times" />
                    </button>
                  </div>
                </div>
                <div className="card-body text-center">
                  <div className="embed-responsive embed-responsive-16by9">
                    <iframe 
                      title="IL 2024" 
                      className="embed-responsive-item" 
                      src="https://app.powerbi.com/view?r=eyJrIjoiOWEwOWJiN2QtNjY4YS00MDA2LTliM2ItY2MxOGEwN2FlNjlkIiwidCI6IjgxNjQwZjgyLTVjNDAtNGI5Yi1hYWM2LWQzMjM4ODQ2NjcxMSIsImMiOjR9" 
                      frameBorder="0" 
                      allowFullScreen>
                    </iframe>
                  </div>
                </div>
                {/* /.card-body */}
              </div>
              {/* /.card */}
            </div>
          </div>
        </div>
      </section>
      {/* /.content */}
    </div>
  );
}
