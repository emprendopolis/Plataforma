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
      {/* Main content */}
      <section className="content" style={{ paddingTop: '10px' }}>
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              {/* Default box */}
              <div className="card" style={{ marginTop: '0' }}>
                {/* Card header removido para eliminar botones de control */}
                <div className="card-body text-center" style={{ padding: '10px' }}>
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
