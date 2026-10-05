import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-ink-50 flex flex-col animate-fade-in">
      <div className="sticky top-0 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-ink-100">
          <ArrowLeft size={20} className="text-ink-600" />
        </button>
        <h1 className="font-semibold text-ink-800">Aviso de Privacidad</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6 text-ink-700 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-bold text-ink-800 mb-2">AVISO DE PRIVACIDAD</h2>
            <p>
              Pixio (en adelante, "la Plataforma") esta comprometida con la proteccion de los datos
              personales y la privacidad de nuestros usuarios, tanto de los clientes que solicitan
              servicios como de los contratistas y trabajadores independientes que prestan sus servicios
              a traves de la aplicacion.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink-800 mb-2">1. DATOS PERSONALES QUE RECOPILAMOS</h3>
            <p className="mb-2">
              Recopilamos la siguiente informacion personal necesaria para la prestacion del servicio:
            </p>
            <ul className="list-disc list-inside space-y-1 text-ink-600">
              <li><span className="font-medium text-ink-700">Datos de Identificacion:</span> Nombre completo, direccion de correo electronico, numero de telefono y fotografia de perfil.</li>
              <li><span className="font-medium text-ink-700">Datos de Ubicacion:</span> Direccion del inmueble o coordenadas de ubicacion geografica en la cual se requiere el servicio o se prestara el mismo.</li>
              <li><span className="font-medium text-ink-700">Datos Tecnicos y de Uso:</span> Direccion IP, tipo de dispositivo, sistema operativo e historial de interaccion con la Plataforma.</li>
              <li><span className="font-medium text-ink-700">Datos de Transacciones:</span> Historial de solicitudes de servicio, presupuestos enviados, contrataciones y resenas.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-ink-800 mb-2">2. FINALIDAD DEL TRATAMIENTO DE DATOS</h3>
            <p className="mb-2">
              Los datos recopilados seran utilizados exclusivamente para los siguientes fines:
            </p>
            <ul className="list-disc list-inside space-y-1 text-ink-600">
              <li>Crear y gestionar la cuenta de usuario (Cliente o Contratista/Trabajador).</li>
              <li>Facilitar el contacto y la comunicacion entre clientes y contratistas para la cotizacion y ejecucion de proyectos de construccion, mantenimiento, remodelacion y servicios del hogar.</li>
              <li>Permitir la geolocalizacion de solicitudes para conectar al cliente con trabajadores de su zona.</li>
              <li>Enviar notificaciones del estado de las solicitudes, confirmaciones de servicio y avisos importantes sobre la plataforma.</li>
              <li>Garantizar la seguridad de la Plataforma, prevenir fraude y resolver disputas entre usuarios.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-ink-800 mb-2">3. PROTECCION Y ALMACENAMIENTO DE DATOS</h3>
            <p>
              Toda la informacion recolectada se almacena en infraestructura de base de datos segura y
              encriptada (a traves de servicios en la nube de Supabase con autenticacion protegida por
              token). Implementamos medidas de seguridad fisicas, tecnicas y administrativas para evitar
              el acceso no autorizado, alteracion, divulgacion o destruccion de sus datos.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink-800 mb-2">4. COMPARTICION DE DATOS CON TERCEROS</h3>
            <p className="mb-2">
              Pixio no vende, alquila ni comercializa sus datos personales con terceros. La informacion
              del usuario solo se compartira bajo las siguientes circunstancias:
            </p>
            <ul className="list-disc list-inside space-y-1 text-ink-600">
              <li><span className="font-medium text-ink-700">Entre Usuarios de la Plataforma:</span> Cuando un cliente publica una solicitud o acepta una propuesta, los detalles necesarios del proyecto (ubicacion del trabajo, nombre del contacto y descripcion) se comparten con el contratista seleccionado para la realizacion del servicio.</li>
              <li><span className="font-medium text-ink-700">Proveedores de Servicios de Infraestructura:</span> Para el funcionamiento tecnico de la Plataforma (servicios de autenticacion, almacenamiento en la nube y servidor de correos).</li>
              <li><span className="font-medium text-ink-700">Requerimiento Legal:</span> Cuando sea exigido por ley o autoridad competente mediante orden judicial.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-ink-800 mb-2">5. DERECHOS ARCO Y CANCELACION DE CUENTA</h3>
            <p>
              Todo usuario tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de
              sus datos personales (Derechos ARCO), asi como a solicitar la eliminacion definitiva de su
              cuenta de la Plataforma. Para ejercer cualquiera de estos derechos o solicitar la baja de
              su informacion, el usuario puede enviar una solicitud directa desde la configuracion de su
              perfil o enviando un correo a soporte de Pixio.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink-800 mb-2">6. MODIFICACIONES AL AVISO DE PRIVACIDAD</h3>
            <p>
              Nos reservamos el derecho de actualizar o modificar este Aviso de Privacidad en cualquier
              momento. Cualquier cambio significativo sera notificado a traves de la aplicacion o
              mediante el correo electronico registrado por el usuario.
            </p>
          </div>

          <p className="text-xs text-ink-400 pt-4 border-t border-ink-100">
            Fecha de ultima actualizacion: Septiembre 2026.
          </p>
        </div>
      </div>
    </div>
  );
}
