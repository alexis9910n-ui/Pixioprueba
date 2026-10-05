import { X } from 'lucide-react';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
  lang: string;
}

export function TermsModal({ open, onClose, lang }: TermsModalProps) {
  if (!open) return null;
  const isEs = lang === 'es';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 shrink-0">
          <h2 className="text-lg font-bold text-ink-800">
            {isEs ? 'Términos y Condiciones' : 'Terms & Conditions'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 text-xs text-ink-600 leading-relaxed space-y-4">
          {isEs ? <TermsContentEs /> : <TermsContentEn />}
        </div>
        <div className="px-6 py-4 border-t border-ink-100 shrink-0">
          <button type="button" onClick={onClose} className="btn-primary w-full">
            {isEs ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TermsContentEs() {
  return (
    <>
      <p className="font-bold text-sm text-ink-800">TÉRMINOS Y CONDICIONES DE USO — PIXIO</p>
      <p>Última actualización: Julio 2025</p>

      <div>
        <p className="font-semibold text-ink-800 mb-1">1. ACEPTACIÓN DE TÉRMINOS</p>
        <p>Al registrarte y utilizar Pixio ("la Plataforma"), aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no deberás usar la Plataforma. El uso continuado implica la aceptación de cualquier actualización futura de estos términos.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">2. DESCRIPCIÓN DEL SERVICIO</p>
        <p>Pixio es una plataforma digital tipo marketplace que conecta a clientes que necesitan servicios del hogar con contratistas independientes verificados. Pixio no es una empresa de construcción, no emplea a los contratistas y no ejecuta los trabajos.</p>
        <ul className="list-disc ml-4 mt-1 space-y-1">
          <li>Publicación de solicitudes de trabajo</li>
          <li>Recepción y comparación de cotizaciones</li>
          <li>Sistema de mensajería entre clientes y contratistas</li>
          <li>Gestión de pagos a través de escrow (fideicomiso digital)</li>
          <li>Sistema de evaluaciones y reputación</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">3. REGISTRO Y CUENTAS</p>
        <p><strong>3.1 Requisitos:</strong> Debes ser mayor de 18 años y proporcionar información veraz y completa. Cada persona puede tener una sola cuenta.</p>
        <p className="mt-1"><strong>3.2 Verificación de Contratistas:</strong> Los contratistas deben completar un proceso de verificación que incluye: documento de identidad oficial con fotografía, selfie de verificación facial, número de licencia comercial o profesional, y datos de la empresa.</p>
        <p className="mt-1"><strong>3.3 Seguridad:</strong> Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra bajo tu cuenta.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">4. PAGOS Y ESCROW</p>
        <p><strong>4.1 Sistema de Escrow:</strong> Todos los pagos se procesan a través de nuestro sistema de fideicomiso digital (escrow). Los fondos son retenidos de forma segura hasta que el trabajo sea completado y aprobado por el cliente.</p>
        <p className="mt-1"><strong>4.2 Liberación de Fondos:</strong> Los fondos se liberan al contratista una vez que: el cliente aprueba el trabajo completado, o han transcurrido 5 días hábiles desde la finalización sin disputa.</p>
        <p className="mt-1"><strong>4.3 Comisiones:</strong> Pixio cobra una comisión por transacción completada. Las tarifas vigentes se muestran antes de confirmar cada pago.</p>
        <p className="mt-1"><strong>4.4 Reembolsos:</strong> En caso de disputa, Pixio mediará entre las partes. Si no se llega a acuerdo, Pixio tomará una decisión basada en la evidencia presentada.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">5. OBLIGACIONES Y CONDUCTA</p>
        <p><strong>5.1 Clientes:</strong> Proporcionar descripciones precisas del trabajo, responder a las cotizaciones en tiempo razonable, realizar los pagos acordados, y tratar a los contratistas con respeto.</p>
        <p className="mt-1"><strong>5.2 Contratistas:</strong> Mantener licencias y seguros vigentes, proporcionar cotizaciones honestas y detalladas, completar los trabajos según lo acordado, y cumplir con los estándares de calidad de Pixio.</p>
        <p className="mt-1"><strong>5.3 Prohibiciones:</strong> Está prohibido proporcionar información falsa, evadir el sistema de pagos, acosar o discriminar a otros usuarios, crear múltiples cuentas, y utilizar la plataforma para actividades ilegales.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">6. DISPUTAS Y RESOLUCIÓN</p>
        <p><strong>6.1 Proceso:</strong> En caso de desacuerdo, ambas partes deben intentar resolver directamente a través de la mensajería de Pixio. Si no se resuelve en 48 horas, cualquier parte puede escalar a mediación de Pixio.</p>
        <p className="mt-1"><strong>6.2 Decisión de Pixio:</strong> La decisión de Pixio en disputas es vinculante para efectos de la liberación de fondos en escrow. Para reclamaciones mayores, las partes pueden recurrir a los tribunales competentes.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">7. LIMITACIÓN DE RESPONSABILIDAD</p>
        <p>Pixio actúa como intermediario tecnológico. No garantizamos la calidad del trabajo, la conducta de los usuarios, ni los resultados de los proyectos. Nuestra responsabilidad máxima se limita a las comisiones cobradas en la transacción en cuestión.</p>
      </div>

      <hr className="border-ink-100" />

      <p className="font-bold text-sm text-ink-800">AVISO DE PRIVACIDAD</p>

      <div>
        <p className="font-semibold text-ink-800 mb-1">1. DATOS QUE RECOPILAMOS</p>
        <p>Nombre completo, correo electrónico, teléfono, ubicación aproximada (geolocalización), datos de verificación de identidad (documento, selfie), información de transacciones y pagos, datos de uso de la plataforma, y comunicaciones entre usuarios.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">2. FINALIDAD</p>
        <p>Gestionar cuentas de usuario, facilitar la conexión cliente-contratista, procesar pagos y escrow, verificar identidades, enviar notificaciones del servicio, mejorar la plataforma, y cumplir obligaciones legales.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">3. PROTECCIÓN DE DATOS</p>
        <p>Datos almacenados en infraestructura segura con encriptación (Supabase/AWS). Acceso restringido por roles y autenticación. Transmisión protegida mediante TLS/HTTPS. Respaldos automáticos encriptados.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">4. COMPARTICIÓN CON TERCEROS</p>
        <p>No vendemos datos personales. Se comparten datos limitados con: otros usuarios dentro del proyecto (nombre, evaluaciones), procesadores de pago (Stripe), proveedores de infraestructura, y autoridades cuando la ley lo requiera.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">5. DERECHOS ARCO</p>
        <p>Puedes Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales desde la configuración de tu perfil o contactándonos directamente. Responderemos en un plazo máximo de 20 días hábiles.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">6. RETENCIÓN</p>
        <p>Conservamos tus datos mientras tu cuenta esté activa. Tras la eliminación de cuenta, se conservarán datos de transacciones por el periodo legalmente requerido (generalmente 5 años para fines fiscales).</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">7. MODIFICACIONES</p>
        <p>Este aviso puede actualizarse. Los cambios significativos serán notificados por la plataforma o correo electrónico. El uso continuado tras la notificación implica aceptación.</p>
      </div>

      <p className="text-ink-400 pt-2 border-t border-ink-100">Última actualización: Julio 2025</p>
    </>
  );
}

function TermsContentEn() {
  return (
    <>
      <p className="font-bold text-sm text-ink-800">TERMS AND CONDITIONS OF USE — PIXIO</p>
      <p>Last updated: July 2025</p>

      <div>
        <p className="font-semibold text-ink-800 mb-1">1. ACCEPTANCE OF TERMS</p>
        <p>By registering and using Pixio ("the Platform"), you accept these Terms and Conditions in full. If you disagree with any part, you must not use the Platform. Continued use implies acceptance of any future updates to these terms.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">2. DESCRIPTION OF SERVICE</p>
        <p>Pixio is a digital marketplace platform that connects clients who need home services with verified independent contractors. Pixio is not a construction company, does not employ contractors, and does not perform the work.</p>
        <ul className="list-disc ml-4 mt-1 space-y-1">
          <li>Posting work requests</li>
          <li>Receiving and comparing quotes</li>
          <li>Messaging system between clients and contractors</li>
          <li>Payment management through escrow</li>
          <li>Rating and reputation system</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">3. REGISTRATION AND ACCOUNTS</p>
        <p><strong>3.1 Requirements:</strong> You must be over 18 and provide truthful, complete information. Each person may have only one account.</p>
        <p className="mt-1"><strong>3.2 Contractor Verification:</strong> Contractors must complete a verification process including: official photo ID, facial verification selfie, commercial or professional license number, and company data.</p>
        <p className="mt-1"><strong>3.3 Security:</strong> You are responsible for keeping your password confidential and for all activity under your account.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">4. PAYMENTS AND ESCROW</p>
        <p><strong>4.1 Escrow System:</strong> All payments are processed through our digital escrow system. Funds are held securely until the work is completed and approved by the client.</p>
        <p className="mt-1"><strong>4.2 Fund Release:</strong> Funds are released to the contractor once: the client approves the completed work, or 5 business days have passed since completion without dispute.</p>
        <p className="mt-1"><strong>4.3 Fees:</strong> Pixio charges a commission per completed transaction. Current rates are shown before confirming each payment.</p>
        <p className="mt-1"><strong>4.4 Refunds:</strong> In case of dispute, Pixio will mediate between parties. If no agreement is reached, Pixio will make a decision based on the evidence presented.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">5. OBLIGATIONS AND CONDUCT</p>
        <p><strong>5.1 Clients:</strong> Provide accurate work descriptions, respond to quotes in reasonable time, make agreed payments, and treat contractors with respect.</p>
        <p className="mt-1"><strong>5.2 Contractors:</strong> Maintain current licenses and insurance, provide honest and detailed quotes, complete work as agreed, and meet Pixio quality standards.</p>
        <p className="mt-1"><strong>5.3 Prohibitions:</strong> It is prohibited to provide false information, circumvent the payment system, harass or discriminate against other users, create multiple accounts, and use the platform for illegal activities.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">6. DISPUTES AND RESOLUTION</p>
        <p><strong>6.1 Process:</strong> In case of disagreement, both parties must try to resolve directly through Pixio messaging. If not resolved within 48 hours, either party can escalate to Pixio mediation.</p>
        <p className="mt-1"><strong>6.2 Pixio Decision:</strong> Pixio's decision in disputes is binding for purposes of escrow fund release. For larger claims, parties may resort to competent courts.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">7. LIMITATION OF LIABILITY</p>
        <p>Pixio acts as a technology intermediary. We do not guarantee work quality, user conduct, or project outcomes. Our maximum liability is limited to the commissions charged on the transaction in question.</p>
      </div>

      <hr className="border-ink-100" />

      <p className="font-bold text-sm text-ink-800">PRIVACY NOTICE</p>

      <div>
        <p className="font-semibold text-ink-800 mb-1">1. DATA WE COLLECT</p>
        <p>Full name, email, phone, approximate location (geolocation), identity verification data (document, selfie), transaction and payment information, platform usage data, and communications between users.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">2. PURPOSE</p>
        <p>Manage user accounts, facilitate client-contractor connections, process payments and escrow, verify identities, send service notifications, improve the platform, and comply with legal obligations.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">3. DATA PROTECTION</p>
        <p>Data stored in secure encrypted infrastructure (Supabase/AWS). Role-based and authentication-restricted access. Transmission protected via TLS/HTTPS. Automatic encrypted backups.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">4. THIRD-PARTY SHARING</p>
        <p>We do not sell personal data. Limited data is shared with: other users within the project (name, ratings), payment processors (Stripe), infrastructure providers, and authorities when required by law.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">5. YOUR RIGHTS</p>
        <p>You can Access, Rectify, Cancel, or Object to the processing of your personal data from your profile settings or by contacting us directly. We will respond within a maximum of 20 business days.</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">6. RETENTION</p>
        <p>We retain your data while your account is active. After account deletion, transaction data will be retained for the legally required period (generally 5 years for tax purposes).</p>
      </div>

      <div>
        <p className="font-semibold text-ink-800 mb-1">7. CHANGES</p>
        <p>This notice may be updated. Significant changes will be notified through the platform or email. Continued use after notification implies acceptance.</p>
      </div>

      <p className="text-ink-400 pt-2 border-t border-ink-100">Last updated: July 2025</p>
    </>
  );
}
