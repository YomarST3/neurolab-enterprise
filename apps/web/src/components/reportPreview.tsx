import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  FileText,
  Maximize,
  Minus,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { time } from "../domain";
import { downloadReport, type ReportArtifact } from "../services/reports";

export function ReportPreview({
  artifact,
  close,
}: {
  artifact: ReportArtifact;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    stage = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy>(),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(0),
    [scaleLabel, setScaleLabel] = useState("Ajustar"),
    [availableWidth, setAvailableWidth] = useState(850),
    [ready, setReady] = useState(artifact.format === "CSV"),
    [renderedKey, setRenderedKey] = useState(""),
    [error, setError] = useState(""),
    [downloaded, setDownloaded] = useState(false);
  const renderKey = `${page}:${zoom}:${availableWidth}`;
  const previewReady =
    artifact.format === "CSV" || (ready && renderedKey === renderKey);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) =>
      setAvailableWidth(entries[0].contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (artifact.format !== "PDF") return;
    let disposed = false,
      task: PDFDocumentLoadingTask | undefined;
    (async () => {
      try {
        const [pdfjs, buffer] = await Promise.all([
          import("pdfjs-dist"),
          artifact.blob.arrayBuffer(),
        ]);
        if (disposed) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        task = pdfjs.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
        });
        const doc = await task.promise;
        if (!disposed) setPdf(doc);
      } catch {
        if (!disposed)
          setError(
            "No se pudo abrir la vista previa. Cierra el visor y vuelve a generar el reporte.",
          );
      }
    })();
    return () => {
      disposed = true;
      void task?.destroy();
    };
  }, [artifact]);
  useEffect(() => {
    if (!pdf) return;
    let disposed = false,
      render: RenderTask | undefined;
    setReady(false);
    setError("");
    (async () => {
      try {
        const documentPage = await pdf.getPage(page);
        if (disposed || !canvas.current) return;
        const natural = documentPage.getViewport({ scale: 1 });
        const scale =
          zoom ||
          Math.max(0.3, Math.min(1.25, (availableWidth - 48) / natural.width));
        const ratio = Math.min(devicePixelRatio || 1, 2),
          view = documentPage.getViewport({ scale: scale * ratio }),
          element = canvas.current;
        element.width = Math.ceil(view.width);
        element.height = Math.ceil(view.height);
        element.style.width = `${view.width / ratio}px`;
        element.style.height = `${view.height / ratio}px`;
        render = documentPage.render({
          canvas: element,
          viewport: view,
          background: "#ffffff",
        });
        await render.promise;
        if (!disposed) {
          setRenderedKey(renderKey);
          setReady(true);
          setScaleLabel(`${Math.round(scale * 100)}%`);
        }
      } catch (e) {
        if (!disposed && (e as Error).name !== "RenderingCancelledException")
          setError(
            "No se pudo dibujar esta página. Vuelve a generar la vista previa.",
          );
      }
    })();
    return () => {
      disposed = true;
      render?.cancel();
    };
  }, [pdf, page, zoom, availableWidth]);
  const count = pdf?.numPages || artifact.pages || 0;
  return (
    <dialog
      ref={dialog}
      className="document-dialog"
      aria-label={`Vista previa del ${artifact.format}`}
      onCancel={close}
    >
      <header className="document-header">
        <div className="row">
          <span className="document-icon">
            <FileText size={21} />
          </span>
          <div>
            <h2>Vista previa del {artifact.format}</h2>
            <p>{artifact.project}</p>
          </div>
          <span className="badge">{artifact.format}</span>
        </div>
        <button
          className="icon-btn"
          aria-label="Cerrar vista previa"
          onClick={close}
        >
          <X size={21} />
        </button>
      </header>
      <div className="document-layout">
        <aside className="document-details">
          <span className="eyebrow">DOCUMENTO LISTO PARA REVISAR</span>
          <h3>
            {artifact.format === "PDF"
              ? "Informe de simulación"
              : "Métricas por época"}
          </h3>
          <p className="muted small">
            Revisa el contenido y confirma la descarga cuando esté listo.
          </p>
          <dl>
            <dt>Proyecto</dt>
            <dd>{artifact.project}</dd>
            <dt>Dataset</dt>
            <dd>{artifact.dataset}</dd>
            <dt>
              {artifact.format === "PDF" ? "Versión incluida" : "Contenido"}
            </dt>
            <dd>{artifact.version}</dd>
            <dt>Generado</dt>
            <dd>{time(artifact.createdAt)}</dd>
            <dt>Tamaño del archivo</dt>
            <dd>{(artifact.blob.size / 1024).toFixed(1)} KB</dd>
          </dl>
          {artifact.format === "PDF" && count > 0 && (
            <div className="document-pages">
              <h4>Páginas del documento</h4>
              <div>
                {Array.from({ length: count }, (_, i) => (
                  <button
                    key={i}
                    className={page === i + 1 ? "active" : ""}
                    aria-label={`Ver página ${i + 1}`}
                    aria-current={page === i + 1 ? "page" : undefined}
                    onClick={() => setPage(i + 1)}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="document-assurance">
            <ShieldCheck size={18} />
            <span>
              Prototipo demostrativo
              <br />
              <strong>Datos simulados</strong>
            </span>
          </div>
        </aside>
        <div className="document-main">
          <div className="document-toolbar">
            <div className="row">
              <FileCheck2 size={15} />
              <span>
                {artifact.format === "PDF"
                  ? `${count || "…"} páginas · A4 vertical`
                  : `${artifact.csv?.rows.length || 0} filas · ${artifact.csv?.headers.length || 0} columnas`}
              </span>
            </div>
            {artifact.format === "PDF" && (
              <>
                <div className="row">
                  <button
                    className="icon-btn"
                    aria-label="Página anterior"
                    disabled={!pdf || page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span className="page-counter" aria-live="polite">
                    Página {page} de {count || "…"}
                  </span>
                  <button
                    className="icon-btn"
                    aria-label="Página siguiente"
                    disabled={!pdf || page >= count}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
                <div className="row">
                  <button
                    className="icon-btn"
                    aria-label="Reducir zoom"
                    disabled={!pdf}
                    onClick={() =>
                      setZoom((z) =>
                        Math.max(
                          0.4,
                          (z || parseInt(scaleLabel) / 100 || 1) - 0.15,
                        ),
                      )
                    }
                  >
                    <Minus size={16} />
                  </button>
                  <span className="zoom-label">{scaleLabel}</span>
                  <button
                    className="icon-btn"
                    aria-label="Aumentar zoom"
                    disabled={!pdf}
                    onClick={() =>
                      setZoom((z) =>
                        Math.min(
                          2,
                          (z || parseInt(scaleLabel) / 100 || 1) + 0.15,
                        ),
                      )
                    }
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="Ajustar página al ancho"
                    disabled={!pdf}
                    onClick={() => setZoom(0)}
                  >
                    <Maximize size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
          <div
            className="document-stage"
            ref={stage}
            data-ready={previewReady ? "true" : "false"}
          >
            {error ? (
              <div className="document-error" role="alert">
                <FileText size={30} />
                <h3>No pudimos mostrar el documento</h3>
                <p>{error}</p>
                <button className="btn" onClick={close}>
                  Volver a Reportes
                </button>
              </div>
            ) : artifact.format === "PDF" ? (
              <>
                <div
                  className="document-paper"
                  style={{ visibility: previewReady ? "visible" : "hidden" }}
                >
                  <canvas
                    ref={canvas}
                    role="img"
                    aria-label={`Página ${page} de ${count} del PDF`}
                    data-testid="pdf-page"
                  />
                </div>
                {!previewReady && (
                  <div className="document-loading" role="status">
                    <span className="document-spinner" />
                    Preparando página {page}…
                  </div>
                )}
              </>
            ) : (
              <div className="csv-sheet">
                <div className="csv-sheet-title">
                  <span>NEUROLAB / EXPORTACIÓN CSV</span>
                  <h2>Métricas de la simulación</h2>
                  <p>{artifact.project}</p>
                </div>
                <div className="csv-metadata">
                  {artifact.csv?.metadata.map((row, i) => (
                    <p key={i}># {row}</p>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th aria-label="Número de fila">#</th>
                        {artifact.csv?.headers.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {artifact.csv?.rows.map((row, i) => (
                        <tr key={i}>
                          <td className="muted">{i + 1}</td>
                          {row.map((v, j) => (
                            <td key={j}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="document-footer">
        <div className="document-file">
          <FileCheck2 size={18} />
          <div>
            <strong>
              {downloaded
                ? "Descarga iniciada"
                : "Este es el archivo que vas a descargar"}
            </strong>
            <small>{artifact.filename}</small>
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={close}>
            Volver a editar
          </button>
          <button
            className="btn primary"
            disabled={!previewReady || !!error}
            onClick={() => {
              downloadReport(artifact);
              setDownloaded(true);
            }}
          >
            <Download size={16} /> Descargar {artifact.format}
          </button>
        </div>
      </footer>
    </dialog>
  );
}
