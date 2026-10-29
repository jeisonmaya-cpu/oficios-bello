/* ==========================================================================
   Teodoro · Biblioteca jurídica de cobro coactivo — CONTENIDO
   Dirección Administrativa de Ejecuciones Fiscales · Alcaldía de Bello
   --------------------------------------------------------------------------
   Este archivo solo tiene texto. Se puede editar sin tocar biblioteca.html.
   Sintaxis de los párrafos (la misma del módulo Peticiones):
     {{CAMPO}}   variable que se llena con los datos de la petición
     **texto**   negrita
     "- texto"   al inicio del párrafo = viñeta
   El primer párrafo de cada oficio es la introducción: en un oficio
   combinado de Peticiones se omite.
   Normas con v:true = cita que la abogada debe verificar antes de aprobar.
   competencia: 'propia'   se resuelve dentro del cobro coactivo
                'limitada' se toca con límites o requiere definir postura
                'ajena'    no se toca en cobro coactivo: se traslada o se informa
   ========================================================================== */

window.BIBLIOTECA = {
  version: '1.0',
  actualizado: '2026-10-28',
  firma: { nombre: 'JUAN PABLO GÓMEZ LONDOÑO', cargo: 'Director Administrativo de Ejecuciones Fiscales' },

  campos: {
    PETICIONARIO:        { label: 'Nombre del peticionario', ejemplo: 'María Fernanda Restrepo Álvarez' },
    CEDULA:              { label: 'Cédula o NIT', ejemplo: '43.123.456' },
    RADICADO:            { label: 'Radicado de entrada', ejemplo: '202610045872' },
    FECHA_RADICACION:    { label: 'Fecha de radicación', ejemplo: '6 de octubre de 2026' },
    EXPEDIENTE:          { label: 'Expediente coactivo', ejemplo: 'TR-2023-018745' },
    COMPARENDO:          { label: 'Número de comparendo', ejemplo: '05088000000041235678' },
    FECHA_COMPARENDO:    { label: 'Fecha del comparendo', ejemplo: '14 de marzo de 2021' },
    NUM_RESOLUCION:      { label: 'Número de la resolución o acto', ejemplo: '0458-2021' },
    FECHA_RESOLUCION:    { label: 'Fecha de la resolución o acto', ejemplo: '22 de abril de 2021' },
    FECHA_MANDAMIENTO:   { label: 'Fecha del mandamiento de pago', ejemplo: '3 de febrero de 2023' },
    FECHA_NOTIFICACION_MP:{ label: 'Fecha de notificación del mandamiento', ejemplo: '17 de marzo de 2023' },
    FORMA_NOTIFICACION:  { label: 'Forma de notificación', ejemplo: 'correo certificado a la dirección registrada' },
    MATRICULA:           { label: 'Matrícula inmobiliaria', ejemplo: '01N-5123456' },
    VIGENCIAS:           { label: 'Vigencias objeto de la solicitud', ejemplo: '2015 a 2019' },
    VIGENCIAS_PRESCRITAS:{ label: 'Vigencias prescritas', ejemplo: '2015, 2016 y 2017' },
    VIGENCIAS_VIGENTES:  { label: 'Vigencias no prescritas', ejemplo: '2018 y 2019' },
    PLACA:               { label: 'Placa del vehículo', ejemplo: 'KLM123' },
    VALOR_DEUDA:         { label: 'Valor de la deuda', ejemplo: '$1.284.300' },
    FECHA_CORTE:         { label: 'Fecha de corte de la liquidación', ejemplo: '31 de octubre de 2026' },
    ENTIDAD_BANCARIA:    { label: 'Entidad bancaria', ejemplo: 'Bancolombia S.A.' },
    VALOR_EMBARGADO:     { label: 'Valor embargado o depositado', ejemplo: '$2.150.000' },
    VALOR_DEVOLVER:      { label: 'Valor a devolver', ejemplo: '$865.700' },
    FECHA_PAGO:          { label: 'Fecha del pago', ejemplo: '9 de septiembre de 2026' },
    VALOR_PAGO:          { label: 'Valor pagado', ejemplo: '$1.284.300' },
    NUM_ACUERDO:         { label: 'Número del acuerdo de pago', ejemplo: 'AP-2025-0312' },
    ENTIDAD_DESTINO:     { label: 'Entidad o dependencia de destino', ejemplo: 'Secretaría de Movilidad de Bello' },
    RAD_TRASLADO:        { label: 'Radicado del traslado', ejemplo: '202610051230' },
    DOCUMENTOS_FALTANTES:{ label: 'Documentos o datos faltantes', ejemplo: 'copia del documento de identidad y poder debidamente otorgado' },
    FECHA_PETICION_ANTERIOR:{ label: 'Fecha de la respuesta anterior', ejemplo: '12 de agosto de 2026' },
    RAD_RESPUESTA_ANTERIOR:{ label: 'Radicado de la respuesta anterior', ejemplo: '202608033415' },
    FECHA_NUEVA_RESPUESTA:{ label: 'Fecha en que se dará respuesta', ejemplo: '18 de noviembre de 2026' },
    MOTIVO_AMPLIACION:   { label: 'Motivo de la ampliación', ejemplo: 'se requiere certificación de la entidad bancaria sobre los depósitos constituidos' },
    ESTADO_PROCESO:      { label: 'Etapa actual del proceso', ejemplo: 'con mandamiento de pago notificado y orden de seguir adelante con la ejecución' },
    FECHA_ACEPTACION:    { label: 'Fecha de aceptación del trámite de insolvencia', ejemplo: '2 de septiembre de 2026' },
    AUTORIDAD_INSOLVENCIA:{ label: 'Centro de conciliación, notaría o juzgado', ejemplo: 'Centro de Conciliación de la Cámara de Comercio de Aburrá Sur' }
  },

  categorias: [
    { id: 'extincion',    nombre: 'Prescripción y extinción',          desc: 'Cuándo la obligación ya no se puede cobrar o se extinguió.' },
    { id: 'proceso',      nombre: 'Título y proceso de cobro',         desc: 'Título ejecutivo, mandamiento de pago, excepciones y nulidades.' },
    { id: 'notificacion', nombre: 'Notificaciones',                    desc: 'Cómo, dónde y cuándo se entiende notificado el deudor.' },
    { id: 'medidas',      nombre: 'Embargos y medidas cautelares',     desc: 'Embargo, desembargo, límites e inembargabilidad.' },
    { id: 'pagos',        nombre: 'Pagos, acuerdos y devoluciones',    desc: 'Acuerdos de pago, liquidaciones, aplicación de pagos y remanentes.' },
    { id: 'sujetos',      nombre: '¿Quién debe?',                      desc: 'Infractor, propietario, comprador, herederos y errores de identidad.' },
    { id: 'especiales',   nombre: 'Insolvencia y situaciones especiales', desc: 'Insolvencia, reorganización y alivios por ley especial.' },
    { id: 'peticion',     nombre: 'Trámite de la petición',            desc: 'Copias, información, traslados, requerimientos y términos.' },
    { id: 'fuera',        nombre: 'Fuera de cobro coactivo',           desc: 'Lo que no se discute aquí y a dónde se envía.' }
  ],

  temas: [

  /* ======================= PRESCRIPCIÓN Y EXTINCIÓN ======================= */
  {
    id: 'prescripcion-transito', cat: 'extincion', cartera: ['Tránsito'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Prescripción de multas de tránsito',
    claves: 'comparendo multa prescrita tres años fotomulta simit',
    resumen: 'Las multas de tránsito prescriben en tres años contados desde la fecha del comparendo. La prescripción se interrumpe solo con la notificación del mandamiento de pago, no con su expedición. Es la petición más frecuente de la cartera de tránsito.',
    normas: [
      { ref: 'Art. 159 Ley 769 de 2002, mod. art. 206 Decreto Ley 019 de 2012', txt: 'Las sanciones por infracciones de tránsito prescriben en tres años desde la ocurrencia del hecho; la prescripción se declara de oficio y se interrumpe con la notificación del mandamiento de pago. No puede iniciarse el cobro de sanciones ya prescritas.' },
      { ref: 'Art. 818 Estatuto Tributario', txt: 'Interrumpida la prescripción, el término empieza a correr de nuevo desde el día siguiente a la notificación del mandamiento de pago.' },
      { ref: 'Art. 817 Estatuto Tributario', txt: 'La prescripción puede decretarse de oficio o a solicitud del deudor por el funcionario competente para el cobro.' },
      { ref: 'Art. 819 Estatuto Tributario', txt: 'Lo pagado para satisfacer una obligación prescrita no puede devolverse ni compensarse.' },
      { ref: 'Nuevo término tras la interrupción', txt: 'Hay pronunciamientos que, interrumpida la prescripción, vuelven a contar los tres años del art. 159 y otros que aplican los cinco años del art. 817 ET. La Dirección debe fijar una sola postura y aplicarla de forma uniforme.', v: true }
    ],
    reglas: [
      'El término se cuenta desde la fecha del comparendo, no desde la resolución sancionatoria ni desde la audiencia.',
      'Lo que interrumpe es la notificación del mandamiento de pago dentro de los tres años. Un mandamiento expedido pero notificado tarde no interrumpe.',
      'Revise cada comparendo por separado: en una misma petición puede haber unos prescritos y otros no.',
      'Si concede, el oficio anuncia la resolución; la declaratoria formal se hace por resolución y se ordena levantar embargos.'
    ],
    revisar: [
      'Fecha exacta del comparendo en el SIMIT y en el expediente',
      'Fecha y forma de notificación del mandamiento de pago, con su soporte (guía, constancia o publicación)',
      'Si hubo acuerdo de pago, que también interrumpe',
      'Embargos vigentes que deban levantarse',
      'Pagos hechos sobre el comparendo prescrito (no se devuelven)'
    ],
    errores: [
      'Contar desde la fecha de la resolución sancionatoria.',
      'Tomar la fecha del mandamiento como fecha de interrupción sin verificar la notificación.',
      'Negar la prescripción porque «el deudor nunca pagó»: el pago no tiene relación con el término.'
    ],
    relacionados: ['caducidad-transito', 'fondo-multa', 'devolucion-dineros', 'indebida-notificacion'],
    oficios: [
      { codigo: 'CONCEDE_PRESCRIPCION_TRANSITO', nombre: 'Concede prescripción de comparendo', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la prescripción de la obligación derivada del comparendo n.º {{COMPARENDO}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 159 de la Ley 769 de 2002, modificado por el artículo 206 del Decreto Ley 019 de 2012, dispone que las sanciones impuestas por infracciones a las normas de tránsito prescriben en tres (3) años contados a partir de la ocurrencia del hecho, que la prescripción debe declararse de oficio y que se interrumpe con la notificación del mandamiento de pago.',
        'Revisado el expediente {{EXPEDIENTE}}, se verificó que el comparendo n.º {{COMPARENDO}} fue impuesto el {{FECHA_COMPARENDO}} y que dentro de los tres (3) años siguientes no se notificó mandamiento de pago que interrumpiera el término. En consecuencia, la acción de cobro sobre esta obligación se encuentra prescrita.',
        'Por lo anterior, **esta Dirección accede a su solicitud** y declarará mediante resolución la prescripción de la acción de cobro de la obligación referida. En el mismo acto se ordenará el levantamiento de las medidas cautelares que se hubieren decretado por esta obligación y se reportará la novedad para la actualización de los sistemas de información de tránsito.',
        'Se advierte que, de acuerdo con el artículo 819 del Estatuto Tributario, lo pagado para satisfacer una obligación prescrita no puede ser materia de devolución ni de compensación.'
      ]},
      { codigo: 'NIEGA_PRESCRIPCION_TRANSITO', nombre: 'Niega prescripción: mandamiento notificado a tiempo', decision: 'niega',
        nota: 'Defina si la negativa sale como oficio o como resolución con recursos. Si es oficio, no mencione recursos.',
        parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la prescripción de la obligación derivada del comparendo n.º {{COMPARENDO}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 159 de la Ley 769 de 2002, modificado por el artículo 206 del Decreto Ley 019 de 2012, dispone que las sanciones por infracciones de tránsito prescriben en tres (3) años contados a partir de la ocurrencia del hecho, término que se interrumpe con la notificación del mandamiento de pago.',
        'Revisado el expediente {{EXPEDIENTE}}, se encontró que el comparendo n.º {{COMPARENDO}} fue impuesto el {{FECHA_COMPARENDO}} y que el mandamiento de pago, proferido el {{FECHA_MANDAMIENTO}}, fue notificado el {{FECHA_NOTIFICACION_MP}} mediante {{FORMA_NOTIFICACION}}, esto es, dentro de los tres (3) años previstos en la norma. Con ello el término de prescripción quedó interrumpido.',
        'Conforme al artículo 818 del Estatuto Tributario, interrumpida la prescripción el término empieza a correr de nuevo desde el día siguiente a la notificación del mandamiento de pago, plazo que a la fecha no se ha cumplido.',
        'Por lo anterior, **no es procedente acceder a su solicitud** y el proceso de cobro continuará su curso. Si desea normalizar su situación, puede solicitar la liquidación actualizada de la deuda o la celebración de un acuerdo de pago ante esta Dirección.'
      ]}
    ]
  },

  {
    id: 'prescripcion-tributaria', cat: 'extincion', cartera: ['Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Prescripción de impuesto predial e ICA',
    claves: 'predial industria y comercio cinco años vigencias prescritas',
    resumen: 'La acción de cobro de los impuestos municipales prescribe en cinco años. Se analiza vigencia por vigencia: lo usual es que unas estén prescritas y otras no, y la respuesta debe decirlo con precisión.',
    normas: [
      { ref: 'Art. 817 Estatuto Tributario', txt: 'La acción de cobro prescribe en cinco años, contados desde el vencimiento del plazo para declarar, la presentación de la declaración extemporánea o de corrección, o la ejecutoria del acto de determinación o discusión. Se decreta de oficio o a petición de parte.' },
      { ref: 'Art. 818 Estatuto Tributario', txt: 'Se interrumpe por la notificación del mandamiento de pago, el otorgamiento de facilidades de pago, la admisión de la solicitud de concordato o reorganización y la declaratoria oficial de liquidación forzosa administrativa.' },
      { ref: 'Art. 819 Estatuto Tributario', txt: 'El pago de una obligación prescrita no se puede compensar ni devolver.' },
      { ref: 'Art. 59 Ley 788 de 2002', txt: 'Los municipios aplican los procedimientos del Estatuto Tributario Nacional para la administración, determinación, discusión, cobro y devoluciones de sus tributos.' },
      { ref: 'Art. 69 Ley 1111 de 2006, mod. art. 354 Ley 1819 de 2016', txt: 'Permite determinar oficialmente el predial mediante facturación, que presta mérito ejecutivo cuando se cumplen los requisitos de expedición y difusión.', v: true },
      { ref: 'Estatuto Tributario de Bello', txt: 'Confirme el número del acuerdo vigente y los artículos sobre exigibilidad y prescripción para citarlos junto con el ET.', v: true }
    ],
    reglas: [
      'El término corre desde que la vigencia se hizo exigible según la forma de determinación (factura o liquidación oficial ejecutoriada).',
      'La notificación del mandamiento de pago interrumpe; su sola expedición no.',
      'Un acuerdo de pago, aunque luego se incumpla, interrumpe la prescripción desde su otorgamiento.',
      'Si unas vigencias prescriben y otras no, use el oficio de concesión parcial y liste ambas.'
    ],
    revisar: [
      'Vigencias en mora y su fecha de exigibilidad',
      'Mandamiento de pago: vigencias que incluye y fecha de notificación',
      'Acuerdos de pago previos sobre el predio',
      'Si el predio cambió de propietario (el predial sigue al predio)',
      'Embargos sobre el inmueble o cuentas'
    ],
    errores: [
      'Declarar prescritas vigencias incluidas en un mandamiento notificado dentro del término.',
      'Ignorar un acuerdo de pago antiguo que interrumpió el término.'
    ],
    relacionados: ['predial-propietario', 'acuerdo-pago', 'estado-cuenta'],
    oficios: [
      { codigo: 'CONCEDE_PRESCRIPCION_PREDIAL', nombre: 'Concede prescripción de vigencias de predial', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la prescripción del impuesto predial de las vigencias {{VIGENCIAS}} del inmueble identificado con matrícula inmobiliaria {{MATRICULA}}, esta Dirección da respuesta en los siguientes términos:',
        'De conformidad con el artículo 817 del Estatuto Tributario, aplicable a los tributos municipales por remisión del artículo 59 de la Ley 788 de 2002, la acción de cobro prescribe en el término de cinco (5) años, contados a partir de la fecha en que la obligación se hizo exigible. El artículo 818 del mismo estatuto establece que el término se interrumpe, entre otras causas, por la notificación del mandamiento de pago y por el otorgamiento de facilidades de pago.',
        'Revisado el expediente {{EXPEDIENTE}} y los registros de cartera, se verificó que respecto de las vigencias {{VIGENCIAS}} transcurrieron más de cinco (5) años desde su exigibilidad sin que se notificara mandamiento de pago ni se otorgara facilidad de pago que interrumpiera el término.',
        'Por lo anterior, **esta Dirección accede a su solicitud** y declarará mediante resolución la prescripción de la acción de cobro del impuesto predial de las vigencias {{VIGENCIAS}}, ordenando su depuración de la cuenta del inmueble y el levantamiento de las medidas cautelares decretadas exclusivamente por esas vigencias.',
        'Se advierte que, de acuerdo con el artículo 819 del Estatuto Tributario, los valores pagados por vigencias prescritas no son objeto de devolución ni de compensación.'
      ]},
      { codigo: 'PARCIAL_PRESCRIPCION_PREDIAL', nombre: 'Concede en parte: unas vigencias sí, otras no', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la prescripción del impuesto predial de las vigencias {{VIGENCIAS}} del inmueble con matrícula inmobiliaria {{MATRICULA}}, esta Dirección da respuesta en los siguientes términos:',
        'De conformidad con los artículos 817 y 818 del Estatuto Tributario, aplicables por remisión del artículo 59 de la Ley 788 de 2002, la acción de cobro prescribe en cinco (5) años contados desde la exigibilidad de la obligación, término que se interrumpe con la notificación del mandamiento de pago o con el otorgamiento de facilidades de pago.',
        'Revisado el expediente {{EXPEDIENTE}}, se encontró lo siguiente:',
        '- Vigencias {{VIGENCIAS_PRESCRITAS}}: transcurrieron más de cinco (5) años desde su exigibilidad sin causal de interrupción. **Respecto de ellas se accede a la solicitud** y se declarará la prescripción mediante resolución.',
        '- Vigencias {{VIGENCIAS_VIGENTES}}: el mandamiento de pago proferido el {{FECHA_MANDAMIENTO}} fue notificado el {{FECHA_NOTIFICACION_MP}}, dentro del término legal, por lo que la prescripción quedó interrumpida. **Respecto de ellas no es procedente la solicitud** y el cobro continúa.',
        'Para el pago de las vigencias no prescritas puede solicitar la liquidación actualizada o la celebración de un acuerdo de pago. Los valores pagados por vigencias prescritas no son objeto de devolución, de acuerdo con el artículo 819 del Estatuto Tributario.'
      ]},
      { codigo: 'NIEGA_PRESCRIPCION_PREDIAL', nombre: 'Niega prescripción de predial', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la prescripción del impuesto predial de las vigencias {{VIGENCIAS}} del inmueble con matrícula inmobiliaria {{MATRICULA}}, esta Dirección da respuesta en los siguientes términos:',
        'De conformidad con los artículos 817 y 818 del Estatuto Tributario, aplicables por remisión del artículo 59 de la Ley 788 de 2002, la acción de cobro prescribe en cinco (5) años contados desde la exigibilidad de la obligación, término que se interrumpe, entre otras causas, con la notificación del mandamiento de pago, caso en el cual empieza a correr de nuevo.',
        'Revisado el expediente {{EXPEDIENTE}}, se encontró que el mandamiento de pago que comprende las vigencias {{VIGENCIAS}} fue proferido el {{FECHA_MANDAMIENTO}} y notificado el {{FECHA_NOTIFICACION_MP}} mediante {{FORMA_NOTIFICACION}}, dentro del término legal, con lo cual la prescripción quedó interrumpida y el nuevo término no se ha cumplido.',
        'Por lo anterior, **no es procedente acceder a su solicitud**. Si desea normalizar su situación, puede solicitar la liquidación actualizada de la deuda o la celebración de un acuerdo de pago ante esta Dirección.'
      ]}
    ]
  },

  {
    id: 'caducidad-transito', cat: 'extincion', cartera: ['Tránsito'], frecuencia: 'media', competencia: 'limitada',
    titulo: 'Caducidad de la acción contravencional',
    claves: 'caducidad un año resolución sancionatoria tardía',
    resumen: 'La autoridad de tránsito tiene un año desde los hechos para decidir la contravención. Si la sanción se impuso por fuera de ese año, el título que se cobra queda viciado. No es lo mismo que la prescripción: la caducidad mira la etapa contravencional; la prescripción, la etapa de cobro.',
    normas: [
      { ref: 'Art. 161 Ley 769 de 2002', txt: 'La acción por contravención de las normas de tránsito caduca al año contado desde la ocurrencia de los hechos; dentro de ese término debe decidirse la actuación.', v: true },
      { ref: 'Art. 829-1 Estatuto Tributario', txt: 'En el cobro coactivo no pueden debatirse cuestiones que debieron discutirse en la vía administrativa.' },
      { ref: 'Art. 831 Estatuto Tributario', txt: 'La falta de título ejecutivo es excepción contra el mandamiento de pago; puede ser el cauce si la sanción se expidió con la acción caducada.', v: true }
    ],
    reglas: [
      'Compare la fecha del comparendo con la fecha de la resolución sancionatoria: más de un año entre una y otra es el supuesto de caducidad.',
      'Fije con el Director si la Dirección declara la caducidad o la traslada a la Secretaría de Movilidad, que expidió la sanción.',
      'El módulo de Peticiones ya maneja CONCEDE_CADUCIDAD y NIEGA_CADUCIDAD; estas versiones son más completas para comparar.'
    ],
    revisar: ['Fecha del comparendo', 'Número y fecha de la resolución sancionatoria', 'Si el infractor compareció o se celebró audiencia', 'Postura institucional sobre competencia'],
    errores: ['Confundir caducidad con prescripción y contar tres años.', 'Contar el año hasta la notificación de la sanción cuando la norma mira la decisión.'],
    relacionados: ['prescripcion-transito', 'fondo-multa', 'revocatoria-directa'],
    oficios: [
      { codigo: 'CONCEDE_CADUCIDAD_TRANSITO', nombre: 'Concede caducidad: sanción después del año', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la declaratoria de caducidad respecto del comparendo n.º {{COMPARENDO}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 161 de la Ley 769 de 2002 establece que la acción por contravención de las normas de tránsito caduca al año, contado a partir de la ocurrencia de los hechos que le dieron origen, término dentro del cual la autoridad debe decidir la actuación.',
        'Revisado el expediente {{EXPEDIENTE}}, se verificó que el comparendo n.º {{COMPARENDO}} fue impuesto el {{FECHA_COMPARENDO}} y que la resolución sancionatoria n.º {{NUM_RESOLUCION}} se profirió el {{FECHA_RESOLUCION}}, es decir, cuando ya había transcurrido el año previsto en la ley.',
        'En consecuencia, **esta Dirección accede a su solicitud**: se abstendrá de continuar el cobro de esta obligación, ordenará el levantamiento de las medidas cautelares decretadas por ella y reportará la novedad para la actualización de los sistemas de información de tránsito.'
      ]},
      { codigo: 'NIEGA_CADUCIDAD_TRANSITO', nombre: 'Niega caducidad: sanción dentro del año', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la declaratoria de caducidad respecto del comparendo n.º {{COMPARENDO}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 161 de la Ley 769 de 2002 establece que la acción por contravención de las normas de tránsito caduca al año, contado a partir de la ocurrencia de los hechos.',
        'Revisado el expediente {{EXPEDIENTE}}, se verificó que el comparendo n.º {{COMPARENDO}} fue impuesto el {{FECHA_COMPARENDO}} y que la resolución sancionatoria n.º {{NUM_RESOLUCION}} se profirió el {{FECHA_RESOLUCION}}, dentro del año previsto en la ley. Por tanto, no operó la caducidad.',
        'Por lo anterior, **no es procedente acceder a su solicitud**. Le recordamos que, según el artículo 829-1 del Estatuto Tributario, en el proceso de cobro no pueden debatirse asuntos que debieron discutirse en la actuación administrativa que dio origen a la sanción.'
      ]}
    ]
  },

  {
    id: 'pago-terminacion', cat: 'extincion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Pago total: terminación y archivo',
    claves: 'pagué terminar proceso archivo cancelado',
    resumen: 'Cuando la obligación se paga en su totalidad (capital, intereses y costas), el proceso se termina por pago, se archiva y se levantan las medidas cautelares. Si el pago no cubrió todo, se informa el saldo.',
    normas: [
      { ref: 'Art. 461 Código General del Proceso', txt: 'El pago total de la obligación y las costas termina el proceso ejecutivo y obliga a levantar embargos y secuestros.' },
      { ref: 'Art. 100 Ley 1437 de 2011', txt: 'En lo no previsto por el Estatuto Tributario, el cobro coactivo se rige por el CPACA y, en su defecto, por el CGP.' },
      { ref: 'Art. 839-1 Estatuto Tributario', txt: 'Regula el trámite de los embargos y su levantamiento ante entidades financieras y oficinas de registro.' }
    ],
    reglas: ['Verifique que el pago cubra capital, intereses a la fecha del pago y costas.', 'Si hay depósitos judiciales sobrantes, se devuelven como remanentes.', 'El auto de terminación ordena los oficios de desembargo; no basta con responder la petición.'],
    revisar: ['Soporte del pago y su aplicación en cartera', 'Liquidación a la fecha del pago', 'Embargos activos y entidades a oficiar', 'Depósitos judiciales sobrantes'],
    errores: ['Terminar con saldo de intereses pendiente.', 'Responder la petición sin expedir el auto ni los oficios de desembargo.'],
    relacionados: ['desembargo-pago', 'devolucion-dineros', 'paz-y-salvo'],
    oficios: [
      { codigo: 'CONCEDE_TERMINACION_PAGO', nombre: 'Concede terminación por pago total', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la terminación del proceso de cobro coactivo {{EXPEDIENTE}} por pago, esta Dirección da respuesta en los siguientes términos:',
        'Verificados los registros de recaudo, se constató el pago realizado el {{FECHA_PAGO}} por valor de {{VALOR_PAGO}}, que cubre la totalidad de la obligación, los intereses causados a esa fecha y las costas del proceso.',
        'En consecuencia, y de conformidad con el artículo 461 del Código General del Proceso, aplicable por remisión del artículo 100 de la Ley 1437 de 2011, **esta Dirección accede a su solicitud** y proferirá auto de terminación del proceso por pago total, ordenando el archivo del expediente y el levantamiento de las medidas cautelares vigentes, para lo cual se librarán los oficios correspondientes.',
        'Si existieren depósitos judiciales que excedan el valor de la obligación, se tramitará su devolución a su favor como remanente.'
      ]},
      { codigo: 'NIEGA_TERMINACION_SALDO', nombre: 'Niega terminación: queda saldo', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la terminación del proceso de cobro coactivo {{EXPEDIENTE}} por pago, esta Dirección da respuesta en los siguientes términos:',
        'Verificados los registros de recaudo, se constató el pago realizado el {{FECHA_PAGO}} por valor de {{VALOR_PAGO}}, el cual fue aplicado a la obligación. Sin embargo, dicho valor no cubre la totalidad de la deuda, pues a la fecha de corte {{FECHA_CORTE}} persiste un saldo de {{VALOR_DEUDA}}, que corresponde a intereses moratorios y demás conceptos causados hasta la fecha del pago.',
        'Por lo anterior, **no es procedente por ahora la terminación del proceso**. Una vez se pague el saldo indicado, se proferirá el auto de terminación y se levantarán las medidas cautelares. Si lo requiere, puede solicitar la liquidación detallada o un acuerdo de pago por el saldo.'
      ]}
    ]
  },

  {
    id: 'remision-deudas', cat: 'extincion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'baja', competencia: 'limitada',
    titulo: 'Remisión y depuración de cartera',
    claves: 'remisión condonación castigo cartera incobrable baja cuantía',
    resumen: 'La ley permite a la administración suprimir de sus registros deudas incobrables (por ejemplo, de personas fallecidas sin bienes o de baja cuantía y gran antigüedad). Es una facultad oficiosa de la entidad, no un derecho que el deudor pueda exigir.',
    normas: [
      { ref: 'Art. 820 Estatuto Tributario', txt: 'Faculta para suprimir de los registros las deudas a cargo de personas fallecidas sin bienes y otras de baja cuantía y antigüedad, previa gestión de cobro y bajo las condiciones que fija la norma.', v: true },
      { ref: 'Art. 2 Ley 1066 de 2006', txt: 'Obliga a las entidades con cartera a su favor a expedir un reglamento interno de recaudo de cartera.' }
    ],
    reglas: ['Responda que la solicitud se estudiará dentro de la depuración, sin prometer resultado.', 'Confirme montos y antigüedad vigentes del art. 820 antes de citarlos.'],
    revisar: ['Cuantía y antigüedad de la deuda', 'Gestiones de cobro realizadas', 'Reglamento interno de cartera'],
    errores: ['Responder como si fuera un derecho del deudor.'],
    relacionados: ['deudor-fallecido', 'descuentos-intereses'],
    oficios: [
      { codigo: 'INFORMA_REMISION_CARTERA', nombre: 'Informa: la remisión es facultad de la entidad', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la remisión o supresión de la deuda a su cargo dentro del expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 820 del Estatuto Tributario faculta a la administración para suprimir de sus registros determinadas deudas, siempre que se cumplan las condiciones que la misma norma exige y se haya agotado la gestión de cobro. Se trata de una facultad de la entidad para depurar su cartera y no de un derecho que el deudor pueda reclamar.',
        'Revisada la obligación a su cargo, por valor de {{VALOR_DEUDA}} con corte al {{FECHA_CORTE}}, se encuentra que no reúne en este momento las condiciones previstas para su remisión. En consecuencia, la obligación sigue siendo exigible.',
        'Si desea normalizar su situación, puede solicitar la celebración de un acuerdo de pago, que le permite cancelar la deuda por cuotas y suspender el proceso.'
      ]}
    ]
  },

  {
    id: 'perdida-ejecutoria', cat: 'extincion', cartera: ['Tránsito', 'Predial'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Pérdida de fuerza ejecutoria',
    claves: 'decaimiento artículo 91 cinco años en firme',
    resumen: 'Algunos peticionarios invocan el art. 91 del CPACA para decir que el acto perdió fuerza ejecutoria por no ejecutarse en cinco años. En obligaciones de dinero sometidas a cobro coactivo rige la prescripción de la acción de cobro, y si hubo mandamiento de pago notificado, la administración sí ejecutó el acto.',
    normas: [
      { ref: 'Art. 91 num. 3 Ley 1437 de 2011', txt: 'Los actos pierden obligatoriedad cuando, al cabo de cinco años en firme, la autoridad no ha realizado los actos que le correspondan para ejecutarlos.' },
      { ref: 'Arts. 817 y 818 Estatuto Tributario; art. 159 Ley 769 de 2002', txt: 'Regulan de forma especial la extinción por el paso del tiempo de las obligaciones dinerarias en cobro.' },
      { ref: 'Relación entre art. 91 CPACA y prescripción', txt: 'Confirme la línea jurisprudencial que acoge la Dirección antes de aprobar.', v: true }
    ],
    reglas: ['Si en realidad pasaron los términos sin interrupción, conceda por prescripción, no por art. 91.', 'Si hubo mandamiento notificado, ese es el acto de ejecución.'],
    revisar: ['Fecha de firmeza del título', 'Fecha de notificación del mandamiento', 'Si procede revisar prescripción de oficio'],
    errores: ['Negar sin revisar de oficio la prescripción.'],
    relacionados: ['prescripcion-transito', 'prescripcion-tributaria'],
    oficios: [
      { codigo: 'NIEGA_PERDIDA_EJECUTORIA', nombre: 'Niega pérdida de fuerza ejecutoria', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita que se declare la pérdida de fuerza ejecutoria del acto que sirve de título en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El numeral 3 del artículo 91 de la Ley 1437 de 2011 prevé la pérdida de fuerza ejecutoria cuando, al cabo de cinco (5) años de estar en firme el acto, la autoridad no ha realizado los actos que le corresponden para ejecutarlo.',
        'En el presente caso, el acto que sirve de título quedó en firme y la administración inició su ejecución mediante el mandamiento de pago proferido el {{FECHA_MANDAMIENTO}} y notificado el {{FECHA_NOTIFICACION_MP}}. Por tanto, no se configura el supuesto de la norma. Adicionalmente, el paso del tiempo en las obligaciones de dinero sometidas a cobro coactivo está regulado de forma especial por las normas de prescripción de la acción de cobro, cuyo término, según la revisión efectuada, no se ha cumplido.',
        'Por lo anterior, **no es procedente acceder a su solicitud** y el proceso continuará su curso.'
      ]}
    ]
  },

  /* ======================= TÍTULO Y PROCESO ======================= */
  {
    id: 'titulo-ejecutivo', cat: 'proceso', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Título ejecutivo: qué se cobra y por qué',
    claves: 'título ejecutivo origen deuda resolución sancionatoria liquidación oficial',
    resumen: 'Todo cobro coactivo se apoya en un acto administrativo ejecutoriado que contiene una obligación clara, expresa y exigible. Cuando el ciudadano pregunta «de dónde sale esta deuda», se le identifica el título y su ejecutoria.',
    normas: [
      { ref: 'Art. 828 Estatuto Tributario', txt: 'Prestan mérito ejecutivo, entre otros, las liquidaciones oficiales ejecutoriadas y los demás actos de la administración debidamente ejecutoriados en los que se fijen sumas líquidas de dinero a favor del fisco.' },
      { ref: 'Art. 99 Ley 1437 de 2011', txt: 'Enumera los documentos que prestan mérito ejecutivo a favor de las entidades públicas.' },
      { ref: 'Art. 829 Estatuto Tributario', txt: 'Los actos quedan ejecutoriados cuando no proceden recursos, cuando vence el término sin interponerlos, cuando se renuncia a ellos o cuando se deciden.' },
      { ref: 'Art. 422 Código General del Proceso', txt: 'La obligación debe ser clara, expresa y exigible.' }
    ],
    reglas: ['Identifique número, fecha y autoridad que expidió el título.', 'Si el título no existe o no está ejecutoriado, eso es excepción (art. 831) y amerita revisión de fondo.'],
    revisar: ['Copia del título en el expediente', 'Constancia de ejecutoria', 'Coincidencia de valores entre título y mandamiento'],
    errores: ['Responder sin identificar el acto concreto.'],
    relacionados: ['mandamiento-pago', 'excepciones'],
    oficios: [
      { codigo: 'INFORMA_TITULO_EJECUTIVO', nombre: 'Informa origen de la deuda y título', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita información sobre el origen de la obligación que se cobra en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El proceso de cobro coactivo se adelanta con fundamento en la resolución n.º {{NUM_RESOLUCION}} del {{FECHA_RESOLUCION}}, acto administrativo que se encuentra ejecutoriado y que contiene una obligación clara, expresa y exigible a su cargo, por lo cual presta mérito ejecutivo en los términos de los artículos 828 y 829 del Estatuto Tributario y 99 de la Ley 1437 de 2011.',
        'Con base en ese título se profirió el mandamiento de pago del {{FECHA_MANDAMIENTO}}. A la fecha de corte {{FECHA_CORTE}}, el valor de la obligación asciende a {{VALOR_DEUDA}}, incluidos los intereses moratorios causados.',
        'Si desea consultar el expediente, puede solicitar copia de las piezas procesales o acercarse a esta Dirección. Si requiere normalizar su situación, puede pagar la totalidad de la deuda o solicitar un acuerdo de pago.'
      ]}
    ]
  },

  {
    id: 'mandamiento-pago', cat: 'proceso', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Mandamiento de pago y sus términos',
    claves: 'mandamiento de pago quince días orden de ejecución citación',
    resumen: 'El mandamiento de pago es la orden de pagar. Desde su notificación el deudor tiene quince días para pagar o proponer excepciones; si no lo hace, se ordena seguir adelante con la ejecución.',
    normas: [
      { ref: 'Art. 826 Estatuto Tributario', txt: 'El mandamiento se notifica personalmente previa citación para que el deudor comparezca en diez días; si no comparece, se notifica por correo.' },
      { ref: 'Art. 830 Estatuto Tributario', txt: 'Dentro de los quince días siguientes a la notificación, el deudor debe pagar o proponer excepciones.' },
      { ref: 'Art. 836 Estatuto Tributario', txt: 'Vencido el término sin excepciones ni pago, se profiere resolución que ordena la ejecución y el remate de los bienes embargados; contra ella no procede recurso.' },
      { ref: 'Art. 833-1 Estatuto Tributario', txt: 'Las actuaciones del procedimiento de cobro son de trámite y no admiten recursos, salvo las que la ley señala.' }
    ],
    reglas: ['Informe la etapa real del proceso, no una genérica.', 'Si el término de 15 días aún corre, dígaselo al deudor de forma expresa.'],
    revisar: ['Fecha de notificación', 'Si se presentaron excepciones', 'Si existe orden de seguir adelante'],
    errores: ['Confundir la fecha de expedición con la de notificación al contar los 15 días.'],
    relacionados: ['excepciones', 'indebida-notificacion', 'estado-proceso'],
    oficios: [
      { codigo: 'INFORMA_MANDAMIENTO_PAGO', nombre: 'Informa qué es el mandamiento y qué puede hacer', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita información sobre el mandamiento de pago proferido en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El mandamiento de pago es el acto con el que se inicia el proceso de cobro coactivo y se ordena al deudor pagar la obligación contenida en el título ejecutivo. En su caso, fue proferido el {{FECHA_MANDAMIENTO}} y notificado el {{FECHA_NOTIFICACION_MP}} mediante {{FORMA_NOTIFICACION}}.',
        'De acuerdo con el artículo 830 del Estatuto Tributario, dentro de los quince (15) días siguientes a la notificación el deudor puede:',
        '- Pagar la totalidad de la obligación con sus intereses.',
        '- Proponer, mediante escrito, las excepciones previstas en el artículo 831 del Estatuto Tributario, aportando las pruebas que las sustenten.',
        'Si vence ese término sin pago ni excepciones, se profiere la resolución que ordena seguir adelante con la ejecución, conforme al artículo 836 del mismo estatuto. En cualquier etapa del proceso puede solicitar un acuerdo de pago.'
      ]}
    ]
  },

  {
    id: 'excepciones', cat: 'proceso', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Excepciones contra el mandamiento de pago',
    claves: 'excepciones artículo 831 pago efectivo falta de título prescripción extemporáneas',
    resumen: 'Las excepciones son taxativas y se proponen dentro de los quince días siguientes a la notificación del mandamiento. Muchas peticiones son en realidad excepciones y deben tramitarse como tales, con resolución que las decida.',
    normas: [
      { ref: 'Art. 831 Estatuto Tributario', txt: 'Excepciones: pago efectivo; existencia de acuerdo de pago; falta de ejecutoria del título; pérdida de ejecutoria por revocación o suspensión provisional; demanda de restablecimiento del derecho o proceso de revisión; prescripción de la acción de cobro; falta de título ejecutivo o incompetencia del funcionario que lo profirió. Para deudores solidarios, además: calidad de deudor solidario e indebida tasación.' },
      { ref: 'Art. 832 Estatuto Tributario', txt: 'Las excepciones se resuelven dentro del mes siguiente a su presentación, con práctica de pruebas cuando haya lugar.' },
      { ref: 'Art. 833 Estatuto Tributario', txt: 'Si se encuentra probada una excepción, se declara y se ordena terminar el proceso y levantar las medidas, total o parcialmente.' },
      { ref: 'Art. 834 Estatuto Tributario', txt: 'Contra la resolución que rechaza excepciones y ordena seguir adelante procede reposición dentro del mes siguiente a su notificación.' },
      { ref: 'Art. 835 Estatuto Tributario y art. 101 Ley 1437 de 2011', txt: 'Solo son demandables ante la jurisdicción las resoluciones que fallan las excepciones y ordenan seguir adelante la ejecución, y la que liquida el crédito.' }
    ],
    reglas: ['Si una petición presentada dentro de los 15 días contiene argumentos de art. 831, trátela como excepción.', 'La prescripción puede pedirse en cualquier momento por petición, aunque las excepciones estén vencidas.', 'Argumentos sobre la legalidad de la sanción no son excepción: van a la autoridad que la impuso.'],
    revisar: ['Fecha de notificación del mandamiento', 'Fecha de radicación del escrito', 'Qué excepción se invoca realmente'],
    errores: ['Responder como simple petición algo que es excepción y dejarlo sin resolución.'],
    relacionados: ['mandamiento-pago', 'fondo-multa', 'prescripcion-transito'],
    oficios: [
      { codigo: 'INFORMA_TRAMITE_EXCEPCIONES', nombre: 'Informa que el escrito se tramita como excepciones', decision: 'informa', parrafos: [
        'En atención a su escrito radicado con el número {{RADICADO}} del {{FECHA_RADICACION}}, relacionado con el mandamiento de pago proferido en el expediente {{EXPEDIENTE}}, esta Dirección le informa lo siguiente:',
        'Revisado su contenido, se encuentra que los argumentos expuestos corresponden a excepciones de las previstas en el artículo 831 del Estatuto Tributario y que el escrito fue presentado dentro de los quince (15) días siguientes a la notificación del mandamiento de pago, como lo exige el artículo 830 del mismo estatuto.',
        'En consecuencia, su escrito **se tramitará como proposición de excepciones** y será decidido mediante resolución dentro del mes siguiente a su presentación, conforme al artículo 832 del Estatuto Tributario, previa práctica de las pruebas a que haya lugar. Dicha resolución le será notificada en debida forma.'
      ]},
      { codigo: 'NIEGA_EXCEPCIONES_EXTEMPORANEAS', nombre: 'Excepciones presentadas fuera de término', decision: 'niega',
        nota: 'Valore si alguno de los argumentos amerita revisión de oficio, en especial la prescripción.',
        parrafos: [
        'En atención a su escrito radicado con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante el cual formula excepciones contra el mandamiento de pago proferido en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 830 del Estatuto Tributario dispone que el deudor cuenta con quince (15) días, contados a partir de la notificación del mandamiento de pago, para cancelar la obligación o proponer excepciones.',
        'El mandamiento de pago fue notificado el {{FECHA_NOTIFICACION_MP}} mediante {{FORMA_NOTIFICACION}}, por lo que el término para proponer excepciones venció antes de la presentación de su escrito. En consecuencia, **no es procedente tramitar las excepciones formuladas** por haber sido presentadas de forma extemporánea.',
        'Sin perjuicio de lo anterior, se revisó de oficio la obligación y no se encontró causal de extinción. Le recordamos que en cualquier etapa del proceso puede solicitar la liquidación de la deuda o un acuerdo de pago.'
      ]}
    ]
  },

  {
    id: 'irregularidades', cat: 'proceso', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'baja', competencia: 'propia',
    titulo: 'Nulidades e irregularidades del proceso',
    claves: 'nulidad irregularidad procesal subsanar error',
    resumen: 'Las irregularidades del procedimiento de cobro se corrigen en cualquier tiempo, de plano, antes de aprobar el remate. Si el peticionario señala un error real, se subsana; si no lo hay, se explica.',
    normas: [
      { ref: 'Art. 849-1 Estatuto Tributario', txt: 'Las irregularidades procesales del procedimiento de cobro deben subsanarse en cualquier tiempo, de plano, antes de que se apruebe el remate de los bienes.' },
      { ref: 'Art. 833-1 Estatuto Tributario', txt: 'Las actuaciones de trámite del cobro no admiten recursos.' }
    ],
    reglas: ['Corrija con auto y diga qué se corrigió y desde cuándo corren los términos.', 'No use esta vía para reabrir discusiones sobre la sanción.'],
    revisar: ['Cuál es el error concreto', 'Qué actuaciones se ven afectadas', 'Si hay remate aprobado'],
    errores: ['Negar de plano sin verificar el error alegado.'],
    relacionados: ['indebida-notificacion', 'datos-errados'],
    oficios: [
      { codigo: 'CONCEDE_SUBSANA_IRREGULARIDAD', nombre: 'Concede: se corrige la irregularidad', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual pone de presente una irregularidad en el proceso de cobro {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 849-1 del Estatuto Tributario dispone que las irregularidades procesales que se presenten en el procedimiento de cobro deben subsanarse en cualquier tiempo, de plano, antes de que se profiera la actuación que aprueba el remate de los bienes.',
        'Revisado el expediente, se encontró que le asiste razón en lo señalado. Por tanto, **esta Dirección accede a su solicitud** y proferirá auto mediante el cual se corrige la actuación, dejando sin efecto lo actuado con base en ella y rehaciendo el trámite en debida forma. Los términos correrán a partir de la notificación de la actuación corregida.'
      ]},
      { codigo: 'NIEGA_NULIDAD', nombre: 'Niega nulidad: no hay irregularidad', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la nulidad de actuaciones del proceso de cobro {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 849-1 del Estatuto Tributario permite subsanar las irregularidades procesales del procedimiento de cobro. Para ello es necesario que exista un vicio real en el trámite que afecte los derechos del deudor.',
        'Revisado el expediente, se encontró que las actuaciones se surtieron conforme al procedimiento: el título se encuentra ejecutoriado, el mandamiento de pago se profirió el {{FECHA_MANDAMIENTO}} y se notificó el {{FECHA_NOTIFICACION_MP}} mediante {{FORMA_NOTIFICACION}}, y las demás actuaciones se ajustan a la ley.',
        'Por lo anterior, **no es procedente acceder a su solicitud**.'
      ]}
    ]
  },

  {
    id: 'revocatoria-directa', cat: 'proceso', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'limitada',
    titulo: 'Revocatoria directa',
    claves: 'revocatoria directa revocar acto sanción',
    resumen: 'La revocatoria directa la decide la autoridad que expidió el acto. Si se pide revocar la resolución sancionatoria de tránsito o la liquidación del impuesto, se traslada; y su sola interposición no suspende el cobro.',
    normas: [
      { ref: 'Arts. 93 a 97 Ley 1437 de 2011', txt: 'Causales, improcedencia, oportunidad y efectos de la revocatoria directa. Su solicitud no revive términos ni suspende los efectos del acto.' },
      { ref: 'Art. 829-1 Estatuto Tributario', txt: 'La revocatoria directa no suspende el proceso de cobro, pero el remate no se realiza hasta que haya pronunciamiento definitivo.' },
      { ref: 'Art. 21 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Traslado al competente dentro de los cinco días siguientes a la recepción.' }
    ],
    reglas: ['Si el acto es de la Dirección (mandamiento, embargos), la decide la Dirección.', 'Si es la sanción o la liquidación, traslade dentro de 5 días hábiles.'],
    revisar: ['Qué acto se pide revocar', 'Quién lo expidió', 'Si hay remate programado'],
    errores: ['Suspender el cobro por la sola solicitud.'],
    relacionados: ['fondo-multa', 'traslado-competencia'],
    oficios: [
      { codigo: 'TRASLADA_REVOCATORIA', nombre: 'Traslada revocatoria al autor del acto', decision: 'traslada', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la revocatoria directa de la resolución n.º {{NUM_RESOLUCION}} del {{FECHA_RESOLUCION}}, esta Dirección le informa lo siguiente:',
        'De acuerdo con el artículo 93 de la Ley 1437 de 2011, la revocatoria directa corresponde a la misma autoridad que expidió el acto o a su inmediato superior. El acto cuya revocatoria solicita fue expedido por {{ENTIDAD_DESTINO}}, por lo cual esta Dirección no es competente para decidirla.',
        'En consecuencia, con fundamento en el artículo 21 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, **su petición fue trasladada a {{ENTIDAD_DESTINO}}** mediante radicado {{RAD_TRASLADO}}, autoridad que le dará respuesta de fondo.',
        'Le informamos que, según el artículo 829-1 del Estatuto Tributario, la solicitud de revocatoria directa no suspende el proceso de cobro coactivo; sin embargo, no se realizará el remate de bienes mientras no exista pronunciamiento definitivo.'
      ]}
    ]
  },

  /* ======================= NOTIFICACIONES ======================= */
  {
    id: 'indebida-notificacion', cat: 'notificacion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: '«Nunca me notificaron»',
    claves: 'notificación indebida dirección errada correo devuelto aviso web',
    resumen: 'La queja más común después de la prescripción. Se responde con el soporte concreto de la notificación: forma, fecha y dirección. Si la notificación fue defectuosa, se rehace y los términos corren desde la nueva.',
    normas: [
      { ref: 'Art. 565 Estatuto Tributario', txt: 'Formas de notificación: personal, por correo y electrónica, entre otras.' },
      { ref: 'Art. 826 Estatuto Tributario', txt: 'Notificación del mandamiento de pago: personal previa citación; si no comparece en diez días, por correo.' },
      { ref: 'Art. 563 Estatuto Tributario', txt: 'Las notificaciones se envían a la dirección informada por el contribuyente o, en su defecto, a la que establezca la administración.' },
      { ref: 'Art. 567 Estatuto Tributario', txt: 'Lo notificado a una dirección distinta de la correcta se corrige en cualquier tiempo enviándolo a la dirección correcta; los términos corren desde la notificación en debida forma.' },
      { ref: 'Art. 568 Estatuto Tributario', txt: 'Las actuaciones enviadas por correo que sean devueltas se notifican mediante aviso en el portal web de la entidad.', v: true }
    ],
    reglas: ['Adjunte o cite el soporte: guía de correo, constancia de entrega o publicación.', 'Si el correo fue devuelto, verifique que se hizo la publicación en la web.', 'La notificación mal hecha no anula el título: solo obliga a rehacerla.'],
    revisar: ['Guía o certificado de entrega', 'Dirección usada vs. dirección registrada', 'Publicación web si hubo devolución', 'Efecto en la prescripción'],
    errores: ['Responder «fue notificado» sin indicar cómo ni cuándo.'],
    relacionados: ['conducta-concluyente', 'prescripcion-transito', 'notificacion-electronica'],
    oficios: [
      { codigo: 'NIEGA_INDEBIDA_NOTIFICACION', nombre: 'Niega: la notificación se hizo en debida forma', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que manifiesta no haber sido notificado de las actuaciones del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'De conformidad con los artículos 565 y 826 del Estatuto Tributario, el mandamiento de pago se notifica personalmente previa citación y, si el deudor no comparece, por correo a la dirección registrada.',
        'Revisado el expediente, se encontró que el mandamiento de pago proferido el {{FECHA_MANDAMIENTO}} fue notificado el {{FECHA_NOTIFICACION_MP}} mediante {{FORMA_NOTIFICACION}}, de lo cual obra soporte en el expediente. En consecuencia, la notificación se surtió en debida forma y produjo sus efectos legales.',
        'Por lo anterior, **no es procedente acceder a su solicitud**. Si desea, puede solicitar copia del soporte de notificación y del mandamiento de pago.'
      ]},
      { codigo: 'CONCEDE_REHACER_NOTIFICACION', nombre: 'Concede: se rehace la notificación', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que manifiesta no haber sido notificado de las actuaciones del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'Revisado el expediente, se encontró que la notificación del mandamiento de pago no se realizó en debida forma, pues fue remitida a una dirección distinta de la registrada.',
        'El artículo 567 del Estatuto Tributario dispone que, en ese caso, la actuación puede corregirse en cualquier tiempo enviándola a la dirección correcta, y que los términos legales solo comienzan a correr a partir de la notificación hecha en debida forma.',
        'En consecuencia, **esta Dirección accede a su solicitud** y procederá a notificar nuevamente el mandamiento de pago. A partir de esa notificación contará con quince (15) días para pagar o proponer excepciones, conforme al artículo 830 del Estatuto Tributario.'
      ]}
    ]
  },

  {
    id: 'conducta-concluyente', cat: 'notificacion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Notificación por conducta concluyente',
    claves: 'conducta concluyente se entiende notificado escrito menciona',
    resumen: 'Si el deudor presenta un escrito en el que menciona el mandamiento de pago o actúa en el proceso, se entiende notificado desde ese escrito. Sirve para sanear notificaciones dudosas y comenzar a contar términos.',
    normas: [
      { ref: 'Art. 72 Ley 1437 de 2011', txt: 'Se entiende notificado quien revela conocer el acto, consiente la decisión o interpone recursos.' },
      { ref: 'Art. 301 Código General del Proceso', txt: 'La notificación por conducta concluyente se produce cuando la parte manifiesta conocer la providencia o la menciona en un escrito que lleve su firma.' }
    ],
    reglas: ['Úselo cuando la notificación original sea dudosa y el escrito del deudor demuestre conocimiento del mandamiento.', 'Indique desde qué fecha corren los 15 días.'],
    revisar: ['Que el escrito mencione el mandamiento concreto', 'Fecha de radicación del escrito'],
    errores: ['Aplicarlo cuando el escrito no se refiere al mandamiento.'],
    relacionados: ['indebida-notificacion', 'mandamiento-pago'],
    oficios: [
      { codigo: 'INFORMA_CONDUCTA_CONCLUYENTE', nombre: 'Se tiene notificado por conducta concluyente', decision: 'informa', parrafos: [
        'En atención a su escrito radicado con el número {{RADICADO}} del {{FECHA_RADICACION}}, relacionado con el proceso de cobro {{EXPEDIENTE}}, esta Dirección le informa lo siguiente:',
        'En su escrito usted hace referencia expresa al mandamiento de pago proferido el {{FECHA_MANDAMIENTO}}, lo que demuestra que conoce su contenido.',
        'De conformidad con el artículo 72 de la Ley 1437 de 2011 y el artículo 301 del Código General del Proceso, **se le tiene notificado por conducta concluyente** del mandamiento de pago a partir del {{FECHA_RADICACION}}, fecha de presentación de su escrito.',
        'A partir de esa fecha cuenta con quince (15) días para pagar la obligación o proponer las excepciones previstas en el artículo 831 del Estatuto Tributario. Adjunto se remite copia del mandamiento de pago.'
      ]}
    ]
  },

  {
    id: 'notificacion-electronica', cat: 'notificacion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Autorización de correo y cambio de dirección',
    claves: 'correo electrónico autorizo notificaciones cambio dirección actualización datos',
    resumen: 'Cuando el ciudadano informa un correo o una nueva dirección, se registra y desde entonces las actuaciones se le envían allí. La notificación electrónica requiere autorización o dirección electrónica informada.',
    normas: [
      { ref: 'Art. 56 Ley 1437 de 2011', txt: 'Las autoridades pueden notificar por medios electrónicos cuando el administrado lo haya aceptado.' },
      { ref: 'Art. 565 y 566-1 Estatuto Tributario, mod. Ley 2010 de 2019', txt: 'Regulan la notificación electrónica de actos de la administración tributaria.', v: true },
      { ref: 'Art. 563 Estatuto Tributario', txt: 'Dirección para notificaciones.' },
      { ref: 'Ley 1581 de 2012', txt: 'Los datos se usan solo para la finalidad informada.' }
    ],
    reglas: ['Registre el dato en Teodoro y en el expediente el mismo día.', 'No afecta notificaciones ya hechas.'],
    revisar: ['Que la solicitud venga del titular o apoderado', 'Registro en la base de contribuyentes'],
    errores: ['Creer que el nuevo correo invalida notificaciones anteriores.'],
    relacionados: ['indebida-notificacion'],
    oficios: [
      { codigo: 'CONCEDE_AUTORIZACION_CORREO', nombre: 'Registra correo y dirección para notificaciones', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual informa su dirección de correo electrónico y autoriza que las actuaciones del proceso {{EXPEDIENTE}} le sean notificadas por ese medio, esta Dirección da respuesta en los siguientes términos:',
        '**Se accede a su solicitud**. Su dirección electrónica fue registrada y, de conformidad con el artículo 56 de la Ley 1437 de 2011 y las normas del Estatuto Tributario sobre notificación electrónica, las actuaciones que se profieran en adelante le serán notificadas por ese medio.',
        'Le recordamos que es su responsabilidad mantener actualizada la dirección informada. Las actuaciones notificadas antes de esta fecha conservan plena validez.'
      ]}
    ]
  },

  /* ======================= EMBARGOS ======================= */
  {
    id: 'embargo-informacion', cat: 'medidas', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: '«¿Por qué me embargaron?»',
    claves: 'embargo cuenta bancaria por qué congelada medida cautelar',
    resumen: 'El embargo es una medida cautelar que puede decretarse desde antes del mandamiento de pago. Se explica el origen, el monto y cómo levantarlo (pago, acuerdo o causal legal).',
    normas: [
      { ref: 'Art. 837 Estatuto Tributario', txt: 'Previa o simultáneamente con el mandamiento de pago pueden decretarse el embargo y secuestro preventivo de bienes del deudor.' },
      { ref: 'Art. 839-1 Estatuto Tributario', txt: 'Trámite de los embargos de sumas en entidades financieras y de bienes sujetos a registro.' },
      { ref: 'Art. 838 Estatuto Tributario', txt: 'El valor de los bienes embargados no puede exceder el doble de la deuda más sus intereses.' }
    ],
    reglas: ['Diga qué obligación respalda el embargo y su valor actual.', 'Explique las tres salidas: pago total, acuerdo de pago o causal de inembargabilidad.'],
    revisar: ['Auto de embargo', 'Entidades oficiadas', 'Depósitos ya constituidos'],
    errores: ['No informar el valor exacto para levantar el embargo.'],
    relacionados: ['desembargo-pago', 'desembargo-acuerdo', 'inembargabilidad-salario', 'cuenta-ahorro'],
    oficios: [
      { codigo: 'INFORMA_EMBARGO', nombre: 'Informa origen del embargo y cómo levantarlo', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita información sobre el embargo de sus productos en {{ENTIDAD_BANCARIA}}, esta Dirección da respuesta en los siguientes términos:',
        'El embargo fue decretado dentro del proceso de cobro coactivo {{EXPEDIENTE}}, adelantado para el cobro de la obligación contenida en la resolución n.º {{NUM_RESOLUCION}}. El artículo 837 del Estatuto Tributario autoriza decretar el embargo de bienes del deudor previa o simultáneamente con el mandamiento de pago, con el fin de garantizar el pago de la deuda.',
        'A la fecha de corte {{FECHA_CORTE}}, la obligación asciende a {{VALOR_DEUDA}}, incluidos los intereses moratorios. Para obtener el levantamiento de la medida usted puede:',
        '- Pagar la totalidad de la obligación, caso en el cual se terminará el proceso y se librará el oficio de desembargo.',
        '- Solicitar un acuerdo de pago, en el marco del cual podrá estudiarse el levantamiento de la medida.',
        '- Acreditar que los recursos embargados tienen la condición de inembargables, aportando los soportes correspondientes.'
      ]}
    ]
  },

  {
    id: 'desembargo-pago', cat: 'medidas', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Desembargo por pago',
    claves: 'desembargo levantar embargo ya pagué oficio banco',
    resumen: 'Pagada la totalidad, se ordena el levantamiento del embargo y se libran oficios a las entidades. Si queda saldo, se informa y el embargo se mantiene.',
    normas: [
      { ref: 'Art. 839-1 Estatuto Tributario', txt: 'Trámite y levantamiento de embargos ante entidades financieras y registro.' },
      { ref: 'Art. 461 Código General del Proceso', txt: 'Pagada la obligación, se ordena el levantamiento de embargos.' }
    ],
    reglas: ['Libre los oficios a todas las entidades oficiadas, no solo a la que menciona el peticionario.', 'Si hay depósitos ya constituidos sobrantes, trámite de remanentes.'],
    revisar: ['Pago aplicado', 'Lista de entidades oficiadas', 'Depósitos constituidos'],
    errores: ['Levantar el embargo en un banco y olvidar los demás.'],
    relacionados: ['pago-terminacion', 'devolucion-dineros'],
    oficios: [
      { codigo: 'CONCEDE_DESEMBARGO_PAGO', nombre: 'Concede desembargo por pago total', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo decretado en el proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'Verificados los registros de recaudo, se constató el pago realizado el {{FECHA_PAGO}} por valor de {{VALOR_PAGO}}, con el cual se cubrió la totalidad de la obligación.',
        'En consecuencia, **esta Dirección accede a su solicitud** y ordena el levantamiento de las medidas cautelares decretadas en el proceso. Los oficios de desembargo serán remitidos a {{ENTIDAD_BANCARIA}} y a las demás entidades que hubieren sido oficiadas. Una vez la entidad registre la orden, los recursos quedarán liberados.'
      ]},
      { codigo: 'NIEGA_DESEMBARGO_SALDO', nombre: 'Niega desembargo: hay saldo', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo decretado en el proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'Revisados los registros de recaudo, se encontró que la obligación no ha sido cancelada en su totalidad. A la fecha de corte {{FECHA_CORTE}} existe un saldo de {{VALOR_DEUDA}}.',
        'Por lo anterior, **no es procedente por ahora el levantamiento de la medida**, que tiene por objeto garantizar el pago de la deuda. Una vez se acredite el pago del saldo, o se celebre un acuerdo de pago, se estudiará nuevamente el desembargo.'
      ]}
    ]
  },

  {
    id: 'desembargo-acuerdo', cat: 'medidas', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Desembargo por acuerdo de pago',
    claves: 'acuerdo de pago levantar embargo suspensión',
    resumen: 'Celebrado un acuerdo de pago, el proceso se suspende y las medidas pueden levantarse. La ley dice «podrán»: es una decisión de la Dirección según las garantías y el reglamento de cartera.',
    normas: [
      { ref: 'Art. 841 Estatuto Tributario', txt: 'En cualquier etapa del procedimiento el deudor puede celebrar acuerdo de pago; se suspende el procedimiento y se podrán levantar las medidas preventivas decretadas.' },
      { ref: 'Art. 814 Estatuto Tributario', txt: 'Facilidades de pago y garantías.' }
    ],
    reglas: ['Defina en el reglamento si el desembargo es automático o depende de la cuota inicial/garantía.', 'Si hay depósitos ya constituidos, pueden aplicarse a la cuota inicial.'],
    revisar: ['Acuerdo firmado y vigente', 'Cuota inicial pagada', 'Garantía si aplica'],
    errores: ['Desembargar antes de firmar el acuerdo.'],
    relacionados: ['acuerdo-pago', 'incumplimiento-acuerdo'],
    oficios: [
      { codigo: 'CONCEDE_DESEMBARGO_ACUERDO', nombre: 'Concede desembargo por acuerdo vigente', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo decretado en el proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 841 del Estatuto Tributario establece que, celebrado un acuerdo de pago, se suspende el procedimiento de cobro y se podrán levantar las medidas preventivas decretadas.',
        'Verificado que usted suscribió el acuerdo de pago n.º {{NUM_ACUERDO}} y que se encuentra al día en sus obligaciones, **esta Dirección accede a su solicitud** y ordena el levantamiento del embargo. El oficio correspondiente será remitido a {{ENTIDAD_BANCARIA}}.',
        'Le advertimos que, si incumple el acuerdo, se dejará sin efecto, se reanudará el proceso y podrán decretarse nuevamente medidas cautelares.'
      ]}
    ]
  },

  {
    id: 'inembargabilidad-salario', cat: 'medidas', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Inembargabilidad del salario',
    claves: 'salario mínimo nómina quinta parte embargo de sueldo',
    resumen: 'El salario mínimo es inembargable y del excedente solo puede embargarse la quinta parte. Si el embargo supera ese límite, se ajusta; si lo respeta, se mantiene.',
    normas: [
      { ref: 'Art. 154 Código Sustantivo del Trabajo', txt: 'No es embargable el salario mínimo legal o convencional.' },
      { ref: 'Art. 155 Código Sustantivo del Trabajo', txt: 'El excedente del salario mínimo solo es embargable en una quinta parte.' },
      { ref: 'Art. 156 Código Sustantivo del Trabajo', txt: 'Excepción: hasta el 50 % para pensiones alimenticias y créditos de cooperativas.' },
      { ref: 'Honorarios de contratistas', txt: 'Los honorarios no son salario; confirme el tratamiento que aplica la Dirección.', v: true }
    ],
    reglas: ['Pida certificado laboral o desprendible de nómina.', 'Calcule: (salario − SMMLV) ÷ 5 = máximo embargable mensual.', 'Si el banco retuvo sobre una cuenta de nómina, combine con el tema de cuentas de ahorro.'],
    revisar: ['Certificado de ingresos', 'Valor retenido por el pagador', 'Otros embargos concurrentes'],
    errores: ['Levantar todo el embargo cuando solo procede ajustarlo.'],
    relacionados: ['cuenta-ahorro', 'minimo-vital', 'inembargabilidad-pension'],
    oficios: [
      { codigo: 'CONCEDE_INEMBARGABILIDAD_SALARIO', nombre: 'Concede: ajusta el embargo al límite legal', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo sobre su salario decretado en el proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'De acuerdo con los artículos 154 y 155 del Código Sustantivo del Trabajo, el salario mínimo legal es inembargable y del excedente solo puede embargarse una quinta parte.',
        'Revisados los soportes aportados, se encontró que la retención aplicada supera el límite legal. Por lo tanto, **esta Dirección accede a su solicitud** y ordena ajustar el embargo, de manera que solo recaiga sobre la quinta parte del valor que exceda el salario mínimo legal mensual vigente. Se librará oficio al pagador para que aplique el ajuste.',
        'Si se retuvieron sumas por encima del límite legal, se dispondrá su devolución una vez se verifique el valor exacto.'
      ]},
      { codigo: 'NIEGA_INEMBARGABILIDAD_SALARIO', nombre: 'Niega: el embargo respeta el límite', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo sobre su salario decretado en el proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'De acuerdo con los artículos 154 y 155 del Código Sustantivo del Trabajo, el salario mínimo legal es inembargable y del excedente puede embargarse una quinta parte.',
        'Revisados los soportes, se encontró que la retención recae únicamente sobre la quinta parte del excedente del salario mínimo, dentro del límite permitido por la ley.',
        'Por lo anterior, **no es procedente acceder a su solicitud**. Si desea el levantamiento de la medida, puede pagar la obligación o solicitar un acuerdo de pago.'
      ]}
    ]
  },

  {
    id: 'inembargabilidad-pension', cat: 'medidas', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Inembargabilidad de pensiones',
    claves: 'pensión pensionado colpensiones mesada inembargable',
    resumen: 'Las pensiones son inembargables, salvo para alimentos y créditos de cooperativas. Un embargo que recaiga sobre la mesada se levanta y lo retenido se devuelve.',
    normas: [
      { ref: 'Art. 134 num. 5 Ley 100 de 1993', txt: 'Son inembargables las pensiones y demás prestaciones del sistema, salvo para alimentos y créditos con cooperativas.' },
      { ref: 'Art. 344 Código Sustantivo del Trabajo', txt: 'Las prestaciones sociales son inembargables, con las mismas excepciones.' }
    ],
    reglas: ['Exija certificado de la entidad pagadora de la pensión y extracto que muestre que la cuenta recibe la mesada.', 'Si la cuenta mezcla otros ingresos, solo es inembargable lo que proviene de la pensión.'],
    revisar: ['Certificado de pensión', 'Extracto bancario', 'Valor retenido'],
    errores: ['Negar porque la cuenta es de ahorro: lo que importa es el origen del dinero.'],
    relacionados: ['cuenta-ahorro', 'devolucion-dineros'],
    oficios: [
      { codigo: 'CONCEDE_INEMBARGABILIDAD_PENSION', nombre: 'Concede: levanta embargo sobre mesada', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo sobre los recursos de su pensión en {{ENTIDAD_BANCARIA}}, dentro del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El numeral 5 del artículo 134 de la Ley 100 de 1993 dispone que las pensiones son inembargables, salvo para el pago de obligaciones alimentarias y de créditos con cooperativas.',
        'Con los soportes aportados se acreditó que la cuenta embargada recibe el pago de su mesada pensional. Por lo tanto, **esta Dirección accede a su solicitud** y ordena levantar el embargo sobre dichos recursos, para lo cual se librará oficio a {{ENTIDAD_BANCARIA}}.',
        'Los valores que hayan sido retenidos por concepto de la mesada pensional, por {{VALOR_DEVOLVER}}, serán devueltos a su favor.'
      ]}
    ]
  },

  {
    id: 'cuenta-ahorro', cat: 'medidas', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'limitada',
    titulo: 'Límite de inembargabilidad en cuentas de ahorro',
    claves: 'cuenta de ahorros monto inembargable límite superfinanciera',
    resumen: 'Existe un monto de los depósitos de ahorro de personas naturales que no puede embargarse, y el ET fija un límite especial para embargos en cobro coactivo. Este tema requiere que la Dirección fije una postura y el valor vigente antes de usarlo.',
    normas: [
      { ref: 'Art. 837-1 Estatuto Tributario', txt: 'Fija un límite de inembargabilidad para embargos de cuentas de ahorro de personas naturales en procesos de cobro (25 SMMLV en la cuenta de ahorros más antigua).', v: true },
      { ref: 'Art. 126 num. 4 Decreto 663 de 1993 (EOSF)', txt: 'Monto inembargable de los depósitos de ahorro, actualizado periódicamente.', v: true },
      { ref: 'Art. 594 Código General del Proceso', txt: 'Lista general de bienes inembargables.', v: true }
    ],
    reglas: ['Confirme si la Dirección aplica el art. 837-1 ET (redactado para la DIAN) por remisión a los municipios.', 'Use el valor vigente del año; no lo deje fijo en el texto.', 'Normalmente lo aplica el banco al recibir el oficio; verifique antes de responder.'],
    revisar: ['Saldo y antigüedad de la cuenta', 'Si es la cuenta más antigua', 'Certificación del banco'],
    errores: ['Citar un monto desactualizado.'],
    relacionados: ['inembargabilidad-salario', 'minimo-vital'],
    oficios: [
      { codigo: 'CONCEDE_LIMITE_AHORRO', nombre: 'Concede: aplica el límite inembargable', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo sobre su cuenta de ahorros en {{ENTIDAD_BANCARIA}}, dentro del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'La ley establece un límite de inembargabilidad para los depósitos de ahorro de las personas naturales, de manera que las sumas por debajo de dicho límite no pueden ser objeto de embargo.',
        'Revisados los soportes, se encontró que los recursos retenidos en su cuenta se encuentran dentro del límite inembargable. Por lo tanto, **esta Dirección accede a su solicitud** y ordena a {{ENTIDAD_BANCARIA}} levantar la retención sobre dichas sumas y aplicar el límite legal en lo sucesivo.'
      ]},
      { codigo: 'NIEGA_LIMITE_AHORRO', nombre: 'Niega: el embargo recae sobre el excedente', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo sobre su cuenta de ahorros en {{ENTIDAD_BANCARIA}}, dentro del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'La ley establece un límite de inembargabilidad para los depósitos de ahorro de las personas naturales. Las sumas que excedan ese límite sí pueden ser embargadas para garantizar el pago de la deuda.',
        'Revisados los soportes, se encontró que la entidad financiera aplicó el límite legal y la retención recae únicamente sobre el excedente.',
        'Por lo anterior, **no es procedente acceder a su solicitud**. Si desea el levantamiento de la medida, puede pagar la obligación o solicitar un acuerdo de pago.'
      ]}
    ]
  },

  {
    id: 'minimo-vital', cat: 'medidas', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Mínimo vital',
    claves: 'mínimo vital no tengo con qué vivir necesidad única fuente ingresos',
    resumen: 'Cuando el embargo afecta lo indispensable para vivir, la protección constitucional del mínimo vital puede justificar el levantamiento, pero exige prueba: que los recursos son la única fuente de ingresos y que la medida pone en riesgo la subsistencia.',
    normas: [
      { ref: 'Arts. 1, 25 y 53 Constitución Política', txt: 'Dignidad humana, derecho al trabajo y protección de la remuneración mínima vital.' },
      { ref: 'Jurisprudencia de la Corte Constitucional sobre mínimo vital', txt: 'Exige valoración de la situación concreta y prueba de la afectación. Cite sentencias solo después de verificarlas.', v: true }
    ],
    reglas: ['No se presume: pida pruebas antes de decidir.', 'El módulo Peticiones ya tiene NIEGA_MINIMO_VITAL; aquí está el requerimiento previo.'],
    revisar: ['Origen de los recursos', 'Composición del hogar y gastos', 'Otros ingresos'],
    errores: ['Negar de plano sin dar oportunidad de probar.'],
    relacionados: ['inembargabilidad-salario', 'inembargabilidad-pension', 'cuenta-ahorro'],
    oficios: [
      { codigo: 'REQUIERE_PRUEBA_MINIMO_VITAL', nombre: 'Requiere pruebas de afectación', decision: 'requiere', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el levantamiento del embargo decretado en el proceso {{EXPEDIENTE}} por afectación de su mínimo vital, esta Dirección le informa lo siguiente:',
        'La protección del mínimo vital exige demostrar que los recursos embargados son indispensables para la subsistencia del peticionario y su núcleo familiar. Para estudiar de fondo su solicitud, le pedimos aportar:',
        '- Certificación de la fuente de los recursos depositados en la cuenta embargada.',
        '- Extractos bancarios de los últimos tres (3) meses.',
        '- Relación de sus gastos básicos mensuales y de las personas a su cargo, con los soportes que tenga disponibles.',
        '- Cualquier otro documento que demuestre que no cuenta con otros ingresos.',
        'De conformidad con el artículo 17 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, cuenta con un (1) mes para allegar la información. Si no lo hace, se entenderá que desistió de la solicitud, salvo que pida prórroga antes de vencerse el plazo.'
      ]}
    ]
  },

  {
    id: 'exceso-embargo', cat: 'medidas', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'baja', competencia: 'propia',
    titulo: 'Embargo excesivo',
    claves: 'embargo excesivo doble de la deuda reducción varios bancos',
    resumen: 'Los bienes embargados no pueden superar el doble de la deuda más intereses. Si se embargaron varias cuentas o un bien de mucho mayor valor, se reduce el embargo.',
    normas: [
      { ref: 'Art. 838 Estatuto Tributario', txt: 'El valor de los bienes embargados no puede exceder el doble de la deuda más sus intereses; si lo excede, se reduce el embargo, incluso de oficio.' }
    ],
    reglas: ['Sume todo lo embargado en todas las entidades.', 'Levante primero las cuentas que más afecten al deudor.'],
    revisar: ['Valor total de la deuda con intereses', 'Total embargado'],
    errores: ['Revisar solo el banco que menciona el peticionario.'],
    relacionados: ['embargo-informacion', 'devolucion-dineros'],
    oficios: [
      { codigo: 'CONCEDE_REDUCCION_EMBARGO', nombre: 'Concede reducción del embargo', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la reducción de los embargos decretados en el proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 838 del Estatuto Tributario establece que el valor de los bienes embargados no podrá exceder el doble de la deuda más sus intereses y que, si lo excede, debe reducirse el embargo.',
        'La obligación asciende a {{VALOR_DEUDA}} con corte al {{FECHA_CORTE}}, mientras que los valores embargados suman {{VALOR_EMBARGADO}}, por encima del límite legal. En consecuencia, **esta Dirección accede a su solicitud** y ordenará la reducción de las medidas hasta el límite permitido, librando los oficios de levantamiento correspondientes.'
      ]}
    ]
  },

  {
    id: 'embargo-bienes', cat: 'medidas', cartera: ['Tránsito', 'Predial'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Embargo de vehículos e inmuebles',
    claves: 'embargo vehículo inmueble registro secuestro remate placa matrícula',
    resumen: 'El embargo de bienes sujetos a registro se inscribe en la oficina de registro o en el organismo de tránsito. Si no se paga, puede seguir el secuestro, avalúo y remate. Se informa la etapa y cómo levantarlo.',
    normas: [
      { ref: 'Art. 839 Estatuto Tributario', txt: 'Registro del embargo de bienes sujetos a registro y prelación de embargos.' },
      { ref: 'Art. 840 Estatuto Tributario', txt: 'Remate de bienes con base en el avalúo.' },
      { ref: 'Art. 829-1 Estatuto Tributario', txt: 'No se remata mientras haya revocatoria directa pendiente.' }
    ],
    reglas: ['Informe la etapa real (inscripción, secuestro, avalúo, remate).', 'Para levantar se libra oficio a registro o tránsito.'],
    revisar: ['Certificado de tradición o de libertad del vehículo', 'Actas de secuestro', 'Avalúo'],
    errores: ['Prometer el levantamiento sin pago o acuerdo.'],
    relacionados: ['embargo-informacion', 'acuerdo-pago'],
    oficios: [
      { codigo: 'INFORMA_EMBARGO_BIEN', nombre: 'Informa embargo de bien y cómo levantarlo', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita información sobre el embargo registrado sobre su bien dentro del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El embargo fue decretado como medida cautelar para garantizar el pago de la obligación, conforme a los artículos 837 y 839 del Estatuto Tributario, y se encuentra inscrito ante la autoridad de registro correspondiente. Actualmente el proceso está {{ESTADO_PROCESO}}.',
        'A la fecha de corte {{FECHA_CORTE}}, la obligación asciende a {{VALOR_DEUDA}}. Si no se cancela, el procedimiento puede continuar con el secuestro, el avalúo y el remate del bien, en los términos del artículo 840 del Estatuto Tributario.',
        'Para obtener el levantamiento del embargo puede pagar la totalidad de la deuda o solicitar un acuerdo de pago. Una vez cumplido lo anterior, se librará el oficio de levantamiento a la autoridad de registro.'
      ]}
    ]
  },

  /* ======================= PAGOS Y ACUERDOS ======================= */
  {
    id: 'acuerdo-pago', cat: 'pagos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Requisitos para acuerdo de pago',
    claves: 'acuerdo de pago cuotas facilidad financiar F-GAF-68 cuota inicial',
    resumen: 'El deudor puede pedir facilidades de pago en cualquier etapa del proceso. Las condiciones concretas (cuota inicial, plazo, garantías) las fija el reglamento interno de cartera de la entidad.',
    normas: [
      { ref: 'Art. 814 Estatuto Tributario', txt: 'Facilidades de pago hasta por cinco años, con garantías cuando corresponda.' },
      { ref: 'Art. 841 Estatuto Tributario', txt: 'El acuerdo suspende el procedimiento y permite levantar medidas.' },
      { ref: 'Art. 2 Ley 1066 de 2006', txt: 'Reglamento interno de recaudo de cartera de cada entidad.' },
      { ref: 'Reglamento interno de cartera de Bello', txt: 'Confirme el acto vigente y sus condiciones (cuota inicial, número de cuotas, garantías).', v: true }
    ],
    reglas: ['Remita el formato F-GAF-68.', 'No cite porcentajes ni plazos que no estén en el reglamento vigente.'],
    revisar: ['Reglamento vigente', 'Acuerdos anteriores incumplidos'],
    errores: ['Prometer condiciones que el reglamento no permite.'],
    relacionados: ['desembargo-acuerdo', 'incumplimiento-acuerdo', 'estado-cuenta'],
    oficios: [
      { codigo: 'INFORMA_REQUISITOS_ACUERDO', nombre: 'Informa requisitos del acuerdo de pago', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita información para celebrar un acuerdo de pago de la obligación cobrada en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'De conformidad con los artículos 814 y 841 del Estatuto Tributario, en cualquier etapa del proceso de cobro el deudor puede solicitar facilidades de pago. Celebrado el acuerdo, el proceso se suspende mientras se cumpla.',
        'A la fecha de corte {{FECHA_CORTE}}, la obligación asciende a {{VALOR_DEUDA}}. Para formalizar el acuerdo debe presentar:',
        '- El formato de solicitud de acuerdo de pago (F-GAF-68) diligenciado y firmado.',
        '- Copia de su documento de identidad o certificado de existencia y representación legal, si es persona jurídica.',
        '- El soporte de pago de la cuota inicial, según las condiciones del reglamento interno de cartera.',
        '- Las garantías que correspondan, cuando el reglamento las exija.',
        'Le advertimos que el incumplimiento del acuerdo dará lugar a dejarlo sin efecto y a continuar el proceso de cobro.'
      ]}
    ]
  },

  {
    id: 'incumplimiento-acuerdo', cat: 'pagos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Incumplimiento del acuerdo de pago',
    claves: 'incumplí acuerdo cuotas atrasadas nuevo acuerdo reactivar',
    resumen: 'Si el deudor incumple, se deja sin efecto el acuerdo por resolución, se reanuda el cobro y se pueden hacer efectivas las garantías. Si pide un nuevo acuerdo, depende del reglamento.',
    normas: [
      { ref: 'Art. 814-3 Estatuto Tributario', txt: 'Ante el incumplimiento, la administración deja sin efecto la facilidad por resolución, ordena hacer efectiva la garantía y continúa el cobro; contra ella procede reposición.' }
    ],
    reglas: ['Antes de negar un nuevo acuerdo, revise si el reglamento lo permite.', 'Lo pagado se mantiene aplicado.'],
    revisar: ['Cuotas pagadas y en mora', 'Resolución de incumplimiento'],
    errores: ['Reanudar el cobro sin la resolución que deja sin efecto el acuerdo.'],
    relacionados: ['acuerdo-pago', 'estado-cuenta'],
    oficios: [
      { codigo: 'INFORMA_INCUMPLIMIENTO_ACUERDO', nombre: 'Informa efectos del incumplimiento', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, relacionada con el acuerdo de pago n.º {{NUM_ACUERDO}} del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'Revisados los registros, se encontró que el acuerdo presenta cuotas vencidas sin pagar. El artículo 814-3 del Estatuto Tributario dispone que, ante el incumplimiento, la administración dejará sin efecto la facilidad de pago mediante resolución, hará efectivas las garantías y continuará el proceso de cobro.',
        'Los pagos realizados en virtud del acuerdo se mantienen aplicados a la obligación. A la fecha de corte {{FECHA_CORTE}}, el saldo pendiente asciende a {{VALOR_DEUDA}}.',
        'Si desea evitar la reanudación del proceso, puede ponerse al día en las cuotas vencidas o pagar el saldo total. La posibilidad de celebrar un nuevo acuerdo se estudiará conforme al reglamento interno de cartera.'
      ]}
    ]
  },

  {
    id: 'estado-cuenta', cat: 'pagos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Liquidación y estado de cuenta',
    claves: 'cuánto debo liquidación intereses estado de cuenta factura',
    resumen: 'Se entrega la liquidación con capital, intereses moratorios y costas a una fecha de corte, advirtiendo que los intereses siguen corriendo hasta el pago.',
    normas: [
      { ref: 'Arts. 634 y 635 Estatuto Tributario', txt: 'Intereses moratorios a la tasa de usura vigente para créditos de consumo menos dos puntos, liquidados por días calendario.' },
      { ref: 'Art. 3 Ley 1066 de 2006', txt: 'Las obligaciones a favor de entidades públicas causan intereses moratorios a la tasa del art. 635 ET.', v: true }
    ],
    reglas: ['Siempre indique fecha de corte.', 'Adjunte el detalle por obligación o vigencia.'],
    revisar: ['Fecha de corte', 'Pagos parciales aplicados'],
    errores: ['Entregar un valor sin fecha de corte.'],
    relacionados: ['imputacion-pagos', 'acuerdo-pago'],
    oficios: [
      { codigo: 'INFORMA_ESTADO_CUENTA', nombre: 'Entrega liquidación de la deuda', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita el estado de cuenta de la obligación cobrada en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'A la fecha de corte {{FECHA_CORTE}}, la obligación asciende a **{{VALOR_DEUDA}}**, valor que incluye el capital, los intereses moratorios causados y las costas del proceso. Se adjunta la liquidación detallada.',
        'Los intereses moratorios se liquidan por cada día calendario de retraso, conforme a los artículos 634 y 635 del Estatuto Tributario, por lo que el valor a pagar variará según la fecha efectiva del pago. Antes de pagar, le recomendamos solicitar la liquidación actualizada.',
        'Si no puede pagar la totalidad, puede solicitar un acuerdo de pago.'
      ]}
    ]
  },

  {
    id: 'imputacion-pagos', cat: 'pagos', cartera: ['Predial', 'ICA', 'Tránsito'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Imputación de pagos',
    claves: 'abono pago parcial a qué se aplicó intereses primero',
    resumen: 'Los pagos parciales se imputan según el orden legal (sanciones, intereses y luego impuesto o capital), lo que explica por qué el capital baja menos de lo esperado.',
    normas: [
      { ref: 'Art. 804 Estatuto Tributario', txt: 'Los pagos se imputan en forma proporcional a sanciones, intereses e impuesto o capital, según el orden y reglas que fija la norma.', v: true }
    ],
    reglas: ['Explique con cifras cómo se aplicó el abono.', 'Confirme la regla de proporcionalidad vigente antes de redactar el ejemplo.'],
    revisar: ['Detalle del abono', 'Saldo resultante'],
    errores: ['Decir que se aplicó a capital cuando la norma ordena otra cosa.'],
    relacionados: ['estado-cuenta', 'pago-no-aplicado'],
    oficios: [
      { codigo: 'INFORMA_IMPUTACION_PAGO', nombre: 'Explica cómo se aplicó un abono', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita explicación sobre la aplicación del pago realizado el {{FECHA_PAGO}} en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El pago por valor de {{VALOR_PAGO}} fue aplicado a la obligación conforme a las reglas de imputación del artículo 804 del Estatuto Tributario, que ordenan aplicar los pagos a sanciones, intereses y capital en la forma allí prevista. Por esta razón, el abono no se refleja en su totalidad como disminución del capital.',
        'Después de aplicado el pago, el saldo de la obligación a la fecha de corte {{FECHA_CORTE}} es de {{VALOR_DEUDA}}. Se adjunta el detalle de la aplicación.'
      ]}
    ]
  },

  {
    id: 'pago-no-aplicado', cat: 'pagos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: '«Ya pagué y sigue apareciendo»',
    claves: 'ya pagué no aparece pago soporte recibo simit no actualizado',
    resumen: 'Se verifica el pago contra los registros de recaudo. Si aparece, se aplica y se actualiza; si no aparece, se pide el soporte. Muchas veces el pago se hizo a otra obligación o a otra entidad.',
    normas: [
      { ref: 'Art. 17 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Requerimiento para completar la petición.' },
      { ref: 'Art. 831 num. 1 Estatuto Tributario', txt: 'El pago efectivo es excepción contra el mandamiento.' }
    ],
    reglas: ['Busque por cédula, placa, matrícula y valor antes de requerir.', 'Revise si el pago se hizo a otro municipio u organismo de tránsito.'],
    revisar: ['Módulo de Recaudo', 'Fecha y valor del soporte', 'Obligación a la que se aplicó'],
    errores: ['Requerir soporte cuando el pago ya está en recaudo.'],
    relacionados: ['imputacion-pagos', 'pago-terminacion', 'simit-runt'],
    oficios: [
      { codigo: 'CONCEDE_APLICACION_PAGO', nombre: 'Concede: el pago se verificó y se aplicó', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que manifiesta haber pagado la obligación cobrada en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'Verificados los registros de recaudo, se confirmó el pago realizado el {{FECHA_PAGO}} por valor de {{VALOR_PAGO}}. **Se accede a su solicitud**: el pago fue aplicado a la obligación y se actualizó su estado.',
        'Como el pago cubrió la totalidad de la deuda, se proferirá el auto de terminación del proceso y se levantarán las medidas cautelares que existieren. La novedad será reportada para la actualización de los sistemas de información correspondientes.'
      ]},
      { codigo: 'REQUIERE_SOPORTE_PAGO', nombre: 'Requiere soporte del pago', decision: 'requiere', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que manifiesta haber pagado la obligación cobrada en el expediente {{EXPEDIENTE}}, esta Dirección le informa lo siguiente:',
        'Revisados los registros de recaudo, no se encontró un pago que corresponda a esta obligación. Para continuar con el estudio de su solicitud, le pedimos aportar copia legible del comprobante de pago, en el que se observe la fecha, el valor, la entidad recaudadora y la referencia o número de la obligación pagada.',
        'De conformidad con el artículo 17 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, cuenta con un (1) mes para allegar el soporte. Si no lo hace, se entenderá que desistió de la solicitud, salvo que pida prórroga antes de vencerse el plazo.'
      ]}
    ]
  },

  {
    id: 'devolucion-dineros', cat: 'pagos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Devolución de dineros y remanentes',
    claves: 'devolución remanente depósito judicial pago en exceso me cobraron de más',
    resumen: 'Si los depósitos judiciales superan la deuda, el excedente se devuelve. Si el dinero se aplicó a una deuda exigible, no hay devolución. Lo pagado por una obligación prescrita tampoco se devuelve.',
    normas: [
      { ref: 'Art. 461 Código General del Proceso', txt: 'Terminado el proceso por pago, el excedente se entrega al ejecutado, salvo embargo de remanentes.' },
      { ref: 'Art. 819 Estatuto Tributario', txt: 'Lo pagado por obligación prescrita no se devuelve ni se compensa.' },
      { ref: 'Arts. 850 y siguientes Estatuto Tributario', txt: 'Procedimiento de devoluciones de saldos a favor y pagos en exceso o de lo no debido.', v: true }
    ],
    reglas: ['Use el cruce de depósitos contra deuda para fijar el valor exacto.', 'Verifique embargos de remanentes de otros juzgados o entidades antes de devolver.', 'Pida certificación bancaria del titular para el pago.'],
    revisar: ['Depósitos constituidos', 'Valor aplicado', 'Embargos de remanentes', 'Titular de la cuenta'],
    errores: ['Devolver sin verificar embargo de remanentes.', 'Devolver pagos de obligaciones prescritas.'],
    relacionados: ['pago-terminacion', 'inembargabilidad-pension', 'prescripcion-transito'],
    oficios: [
      { codigo: 'CONCEDE_DEVOLUCION_REMANENTE', nombre: 'Concede devolución de remanente', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la devolución de dineros dentro del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'Revisados los depósitos judiciales constituidos a favor del proceso, se encontró que el valor retenido, {{VALOR_EMBARGADO}}, supera el valor total de la obligación, que a la fecha de su aplicación ascendía a {{VALOR_DEUDA}}.',
        'En consecuencia, **esta Dirección accede a su solicitud** y ordenará la devolución del excedente por valor de {{VALOR_DEVOLVER}}, previa verificación de que no existan embargos de remanentes a favor de otras autoridades.',
        'Para efectuar el pago, debe aportar certificación bancaria reciente de una cuenta a su nombre y copia de su documento de identidad, si aún no lo ha hecho.'
      ]},
      { codigo: 'NIEGA_DEVOLUCION_APLICADA', nombre: 'Niega devolución: el dinero se aplicó a deuda exigible', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la devolución de dineros dentro del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'Revisados los registros, se encontró que los valores retenidos, por {{VALOR_EMBARGADO}}, fueron aplicados al pago de la obligación que se cobra en el proceso, la cual es exigible y se encuentra respaldada en título ejecutivo debidamente ejecutoriado.',
        'Al no existir un valor pagado en exceso ni un pago de lo no debido, **no es procedente acceder a la devolución solicitada**.'
      ]},
      { codigo: 'NIEGA_DEVOLUCION_PRESCRITA', nombre: 'Niega devolución de lo pagado por obligación prescrita', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la devolución de lo pagado por una obligación que considera prescrita, dentro del expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 819 del Estatuto Tributario dispone que lo pagado para satisfacer una obligación prescrita no puede ser materia de repetición, aunque el pago se hubiese efectuado sin conocimiento de la prescripción.',
        'En consecuencia, aun si la obligación hubiese estado prescrita al momento del pago, **no es procedente la devolución solicitada**.'
      ]}
    ]
  },

  {
    id: 'descuentos-intereses', cat: 'pagos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'limitada',
    titulo: 'Descuentos, condonación y amnistías',
    claves: 'descuento condonación intereses amnistía rebaja curso pedagógico 50%',
    resumen: 'Las rebajas de capital o intereses solo proceden si una ley o acuerdo municipal vigente las autoriza. Los descuentos por curso pedagógico de tránsito aplican en la etapa contravencional, no en cobro coactivo.',
    normas: [
      { ref: 'Art. 338 Constitución Política', txt: 'Principio de legalidad tributaria.' },
      { ref: 'Art. 136 Ley 769 de 2002', txt: 'Descuentos sobre la multa por realizar curso pedagógico dentro de los plazos de la etapa contravencional.' },
      { ref: 'Alivios vigentes', txt: 'Verifique si hay ley o acuerdo municipal de alivio vigente antes de negar.', v: true }
    ],
    reglas: ['Antes de negar, confirme que no haya un programa de alivio vigente.', 'El curso no se acepta como descuento en cobro coactivo.'],
    revisar: ['Normas de alivio vigentes', 'Etapa del comparendo'],
    errores: ['Negar cuando hay un alivio vigente.'],
    relacionados: ['acuerdo-pago', 'remision-deudas'],
    oficios: [
      { codigo: 'NIEGA_DESCUENTO_INTERESES', nombre: 'Niega descuento o condonación', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita descuento o condonación de intereses de la obligación cobrada en el expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'En virtud del principio de legalidad que rige la administración de los tributos y las sanciones (artículo 338 de la Constitución Política), las entidades públicas solo pueden reducir o condonar capital o intereses cuando una ley o un acuerdo municipal vigente lo autoriza expresamente.',
        'A la fecha no existe norma vigente que permita conceder el beneficio solicitado. Por lo tanto, **no es procedente acceder a su solicitud**. Si desea pagar la deuda en cuotas, puede solicitar un acuerdo de pago.'
      ]},
      { codigo: 'NIEGA_DESCUENTO_CURSO', nombre: 'Niega descuento por curso pedagógico', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita que se aplique el descuento por curso pedagógico al comparendo n.º {{COMPARENDO}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 136 de la Ley 769 de 2002 prevé descuentos sobre el valor de la multa cuando el infractor realiza el curso pedagógico dentro de los plazos de la etapa contravencional, ante la autoridad de tránsito.',
        'La obligación se encuentra hoy en cobro coactivo, etapa posterior en la que ya no es posible aplicar este beneficio. Por lo tanto, **no es procedente acceder a su solicitud**. Si desea pagar en cuotas, puede solicitar un acuerdo de pago.'
      ]}
    ]
  },

  {
    id: 'paz-y-salvo', cat: 'pagos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Paz y salvo y certificado de deuda',
    claves: 'paz y salvo certificado no debo constancia',
    resumen: 'Se expide paz y salvo si no hay obligaciones en cobro coactivo a cargo del peticionario. Si las hay, se informa cuáles y su valor.',
    normas: [
      { ref: 'Art. 14 num. 1 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Las peticiones de documentos se resuelven dentro de los diez días siguientes.' }
    ],
    reglas: ['Precise que el paz y salvo es solo sobre cobro coactivo; el predial corriente lo certifica Rentas.', 'Revise todas las carteras por cédula.'],
    revisar: ['Búsqueda en todas las carteras', 'Procesos terminados recientemente'],
    errores: ['Expedir paz y salvo con deuda de otra cartera.'],
    relacionados: ['estado-cuenta', 'pago-terminacion'],
    oficios: [
      { codigo: 'CONCEDE_PAZ_Y_SALVO', nombre: 'Expide paz y salvo', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita certificado de paz y salvo, esta Dirección da respuesta en los siguientes términos:',
        'Consultadas las bases de datos de esta Dirección, se verificó que a la fecha **no existen obligaciones en proceso de cobro coactivo** a cargo de {{PETICIONARIO}}, identificado(a) con {{CEDULA}}.',
        'Esta certificación se refiere únicamente a los procesos de cobro coactivo a cargo de esta Dirección y no comprende obligaciones que se encuentren en etapa de cobro persuasivo o en otras dependencias de la administración municipal.'
      ]},
      { codigo: 'NIEGA_PAZ_Y_SALVO', nombre: 'No expide paz y salvo: tiene deudas', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita certificado de paz y salvo, esta Dirección da respuesta en los siguientes términos:',
        'Consultadas las bases de datos, se encontró que a cargo de {{PETICIONARIO}}, identificado(a) con {{CEDULA}}, existe el proceso de cobro coactivo {{EXPEDIENTE}}, con un saldo de {{VALOR_DEUDA}} a la fecha de corte {{FECHA_CORTE}}.',
        'Por lo anterior, **no es posible expedir el paz y salvo solicitado**. Una vez se pague la totalidad de la obligación, podrá solicitarlo nuevamente.'
      ]}
    ]
  },

  /* ======================= ¿QUIÉN DEBE? ======================= */
  {
    id: 'no-infractor', cat: 'sujetos', cartera: ['Tránsito'], frecuencia: 'media', competencia: 'ajena',
    titulo: 'Suplantación: «yo no cometí la infracción»',
    claves: 'suplantación no era yo robo de identidad cédula perdida no conduzco',
    resumen: 'Discutir quién cometió la infracción es asunto de la etapa contravencional y, si hay suplantación, de la Fiscalía. En cobro coactivo no se reabre ese debate; se traslada a Movilidad y se orienta al ciudadano.',
    normas: [
      { ref: 'Art. 829-1 Estatuto Tributario', txt: 'En el cobro no se debaten asuntos que debieron discutirse en la actuación administrativa.' },
      { ref: 'Art. 21 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Traslado por competencia dentro de cinco días.' }
    ],
    reglas: ['Traslade a la Secretaría de Movilidad con copia al peticionario.', 'Oriente sobre la denuncia penal si alega suplantación.', 'Si Movilidad revoca la sanción, el cobro termina por falta de título.'],
    revisar: ['Fecha de recibido para contar los 5 días del traslado'],
    errores: ['Negar de fondo algo que no es de la Dirección.'],
    relacionados: ['fondo-multa', 'datos-errados', 'traslado-competencia'],
    oficios: [
      { codigo: 'TRASLADA_SUPLANTACION', nombre: 'Traslada a Movilidad y orienta sobre denuncia', decision: 'traslada', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que manifiesta no haber cometido la infracción que dio origen al comparendo n.º {{COMPARENDO}}, esta Dirección le informa lo siguiente:',
        'Esta Dirección es competente para el cobro de las obligaciones contenidas en actos administrativos ejecutoriados, pero no para revisar la responsabilidad contravencional, que corresponde a la autoridad de tránsito que impuso la sanción. Además, el artículo 829-1 del Estatuto Tributario dispone que en el proceso de cobro no pueden debatirse asuntos que debieron discutirse en la actuación que dio origen a la obligación.',
        'Por lo anterior, con fundamento en el artículo 21 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, **su petición fue trasladada a {{ENTIDAD_DESTINO}}** mediante radicado {{RAD_TRASLADO}}, para lo de su competencia.',
        'Si considera que fue víctima de suplantación de identidad, le sugerimos presentar la denuncia correspondiente ante la Fiscalía General de la Nación y aportar copia de ella a la autoridad de tránsito.'
      ]}
    ]
  },

  {
    id: 'vehiculo-vendido', cat: 'sujetos', cartera: ['Tránsito'], frecuencia: 'media', competencia: 'limitada',
    titulo: 'Vehículo vendido sin traspaso',
    claves: 'vendí el carro moto traspaso no figuro comprador nuevo dueño',
    resumen: 'La propiedad de un vehículo solo cambia con la inscripción del traspaso en el organismo de tránsito. En comparendos tradicionales el obligado es el infractor identificado; en fotomultas se aplica lo dicho por la Corte sobre la responsabilidad del propietario.',
    normas: [
      { ref: 'Art. 47 Ley 769 de 2002', txt: 'La tradición de un vehículo requiere, además de la entrega, su inscripción en el organismo de tránsito.' },
      { ref: 'Sentencia C-038 de 2020, Corte Constitucional', txt: 'Declaró inexequible la solidaridad automática del propietario en las infracciones detectadas por medios tecnológicos.' },
      { ref: 'Traspaso a persona indeterminada', txt: 'Mecanismo administrativo ante el organismo de tránsito; confirme la norma vigente que lo regula.', v: true }
    ],
    reglas: ['Si la multa es por fotodetección y el debate es quién conducía, va a Movilidad.', 'Oriente sobre el traspaso a persona indeterminada si no ubica al comprador.'],
    revisar: ['Tipo de comparendo', 'Fecha de la venta vs. fecha del comparendo', 'Historial en el RUNT'],
    errores: ['Exonerar al deudor por una compraventa no inscrita.'],
    relacionados: ['no-infractor', 'fondo-multa'],
    oficios: [
      { codigo: 'INFORMA_VEHICULO_VENDIDO', nombre: 'Informa efectos de la venta sin traspaso', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que manifiesta haber vendido el vehículo de placa {{PLACA}} antes de la imposición del comparendo n.º {{COMPARENDO}}, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 47 de la Ley 769 de 2002 dispone que la tradición del dominio de los vehículos requiere, además de su entrega, la inscripción en el organismo de tránsito. Mientras esa inscripción no se realice, para efectos legales el vehículo continúa a nombre de quien figura como propietario en el registro.',
        'En el presente caso, la obligación que se cobra se encuentra contenida en un acto administrativo ejecutoriado a su nombre. Las razones que expone sobre la responsabilidad en la infracción debían discutirse ante la autoridad de tránsito en la etapa contravencional, y no pueden debatirse en el proceso de cobro, de conformidad con el artículo 829-1 del Estatuto Tributario.',
        'Si no ha podido formalizar el traspaso por no ubicar al comprador, puede adelantar ante el organismo de tránsito el trámite de traspaso a persona indeterminada, para evitar que en adelante se le atribuyan obligaciones del vehículo.'
      ]}
    ]
  },

  {
    id: 'predial-propietario', cat: 'sujetos', cartera: ['Predial'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Predial: «la deuda es del dueño anterior»',
    claves: 'compré la casa dueño anterior gravamen real nuevo propietario predial',
    resumen: 'El predial es un gravamen real: la deuda sigue al inmueble, sin importar quién era el dueño cuando se causó. El comprador puede repetir contra el vendedor por la vía civil.',
    normas: [
      { ref: 'Art. 60 Ley 1430 de 2010', txt: 'El impuesto predial es un gravamen real que recae sobre el inmueble y puede hacerse efectivo con el predio, independientemente de quién sea su propietario.' }
    ],
    reglas: ['Informe que puede reclamar al vendedor ante la justicia ordinaria.', 'Revise de todos modos la prescripción de vigencias antiguas.'],
    revisar: ['Fecha de la compraventa', 'Vigencias adeudadas', 'Prescripción'],
    errores: ['Desvincular al nuevo propietario.'],
    relacionados: ['prescripcion-tributaria', 'acuerdo-pago'],
    oficios: [
      { codigo: 'NIEGA_PREDIAL_NUEVO_PROPIETARIO', nombre: 'Niega: el predial sigue al inmueble', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que manifiesta que las vigencias {{VIGENCIAS}} del impuesto predial del inmueble con matrícula {{MATRICULA}} corresponden al anterior propietario, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 60 de la Ley 1430 de 2010 establece que el impuesto predial unificado es un gravamen real que recae sobre los bienes raíces, de manera que puede hacerse efectivo con el respectivo predio, independientemente de quién sea su propietario.',
        'En consecuencia, la deuda causada por las vigencias {{VIGENCIAS}} sigue al inmueble y su cobro puede dirigirse contra el actual propietario. Por lo tanto, **no es procedente acceder a su solicitud**.',
        'Lo anterior no le impide reclamar al vendedor, ante la jurisdicción ordinaria, los valores que haya pagado por vigencias anteriores a la compraventa, según lo que se haya pactado en el negocio.'
      ]}
    ]
  },

  {
    id: 'deudor-fallecido', cat: 'sujetos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Deudor fallecido y herederos',
    claves: 'falleció murió herederos sucesión registro de defunción',
    resumen: 'La muerte del deudor no extingue la obligación: responden los herederos a prorrata de su cuota. Las multas de tránsito, por ser sanciones personales, tienen un tratamiento que la Dirección debe definir.',
    normas: [
      { ref: 'Art. 793 lit. a Estatuto Tributario', txt: 'Los herederos y legatarios responden solidariamente por las obligaciones del causante, a prorrata de sus cuotas.' },
      { ref: 'Art. 820 Estatuto Tributario', txt: 'Permite suprimir deudas de personas fallecidas sin bienes.', v: true },
      { ref: 'Multas de tránsito y muerte del infractor', txt: 'Defina la postura sobre la extinción de la sanción personal por muerte del infractor.', v: true }
    ],
    reglas: ['Pida registro civil de defunción.', 'Si hay sucesión en curso, informe al juez o notario.', 'Si no hay bienes, valore remisión.'],
    revisar: ['Registro de defunción', 'Bienes del causante', 'Sucesión'],
    errores: ['Embargar cuentas de herederos sin vincularlos.'],
    relacionados: ['remision-deudas', 'predial-propietario'],
    oficios: [
      { codigo: 'INFORMA_DEUDOR_FALLECIDO', nombre: 'Informa trámite ante fallecimiento del deudor', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que informa el fallecimiento del deudor del proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El fallecimiento del deudor no extingue por sí solo las obligaciones de carácter tributario. De acuerdo con el literal a) del artículo 793 del Estatuto Tributario, los herederos y legatarios responden por las obligaciones del causante a prorrata de sus cuotas hereditarias.',
        'Para adelantar el trámite que corresponda, le pedimos aportar copia del registro civil de defunción y, si existe, información sobre el proceso de sucesión (juzgado o notaría donde se adelanta). Con esa información se determinará si procede continuar el cobro frente a la sucesión, o la depuración de la obligación cuando el causante no haya dejado bienes.'
      ]}
    ]
  },

  {
    id: 'datos-errados', cat: 'sujetos', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'baja', competencia: 'propia',
    titulo: 'Homonimia o cédula errada',
    claves: 'homónimo cédula errada no soy yo mismo nombre error digitación',
    resumen: 'Cuando la obligación se cargó a una cédula equivocada, se corrige, se desvincula a la persona y se levantan los embargos. Requiere verificar el título original.',
    normas: [
      { ref: 'Art. 849-1 Estatuto Tributario', txt: 'Las irregularidades del procedimiento se subsanan en cualquier tiempo.' },
      { ref: 'Art. 45 Ley 1437 de 2011', txt: 'Corrección de errores formales, aritméticos, de digitación o de transcripción.' }
    ],
    reglas: ['Compare nombre, cédula y fecha de expedición en el título.', 'Levante embargos el mismo día.'],
    revisar: ['Título original', 'Embargos activos'],
    errores: ['Corregir en el sistema pero no oficiar a los bancos.'],
    relacionados: ['irregularidades', 'no-infractor'],
    oficios: [
      { codigo: 'CONCEDE_CORRECCION_IDENTIDAD', nombre: 'Concede: desvincula por error de identidad', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que manifiesta que el proceso {{EXPEDIENTE}} se adelanta en su contra por un error en la identificación del deudor, esta Dirección da respuesta en los siguientes términos:',
        'Revisado el título ejecutivo y los registros del proceso, se constató que la obligación fue asociada de manera errónea a su número de identificación, {{CEDULA}}, y que usted no es la persona obligada.',
        'En consecuencia, con fundamento en el artículo 849-1 del Estatuto Tributario y el artículo 45 de la Ley 1437 de 2011, **esta Dirección accede a su solicitud**: se corregirá la identificación del deudor, se le desvinculará del proceso y se ordenará el levantamiento inmediato de las medidas cautelares decretadas en su contra. Los valores que le hayan sido retenidos le serán devueltos.'
      ]}
    ]
  },

  /* ======================= SITUACIONES ESPECIALES ======================= */
  {
    id: 'insolvencia', cat: 'especiales', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'baja', competencia: 'propia',
    titulo: 'Insolvencia de persona natural no comerciante',
    claves: 'insolvencia persona natural centro de conciliación suspensión negociación de deudas',
    resumen: 'Aceptada la solicitud de negociación de deudas, no pueden iniciarse nuevos procesos ejecutivos y se suspenden los que estén en curso. La Dirección debe hacerse parte en el trámite para que la acreencia se reconozca.',
    normas: [
      { ref: 'Art. 545 Código General del Proceso', txt: 'Efectos de la aceptación: no pueden iniciarse nuevos procesos ejecutivos y se suspenden los procesos de ejecución en curso.' },
      { ref: 'Arts. 531 y siguientes Código General del Proceso', txt: 'Procedimiento de insolvencia de la persona natural no comerciante.' }
    ],
    reglas: ['Exija el auto o acta de aceptación del trámite.', 'Avise a la abogada para presentar la acreencia en el trámite.', 'Las medidas se mantienen hasta lo que decida el acuerdo o el juez; confirme la postura.'],
    revisar: ['Auto de aceptación', 'Fecha de aceptación', 'Relación de acreencias'],
    errores: ['No hacerse parte y perder la acreencia en el acuerdo.'],
    relacionados: ['reorganizacion'],
    oficios: [
      { codigo: 'CONCEDE_SUSPENSION_INSOLVENCIA', nombre: 'Suspende el proceso por insolvencia aceptada', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual informa la aceptación de su trámite de negociación de deudas, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 545 del Código General del Proceso dispone que, a partir de la aceptación de la solicitud de negociación de deudas, no podrán iniciarse nuevos procesos ejecutivos contra el deudor y se suspenderán los procesos de ejecución en curso.',
        'Con el soporte aportado se verificó que el trámite fue aceptado el {{FECHA_ACEPTACION}} por {{AUTORIDAD_INSOLVENCIA}}. En consecuencia, **esta Dirección accede a su solicitud** y suspenderá el proceso de cobro {{EXPEDIENTE}} mientras se surte el trámite de insolvencia, en el cual esta entidad actuará como acreedora.'
      ]}
    ]
  },

  {
    id: 'reorganizacion', cat: 'especiales', cartera: ['ICA', 'Predial'], frecuencia: 'baja', competencia: 'propia',
    titulo: 'Reorganización y liquidación de empresas',
    claves: 'reorganización ley 1116 supersociedades liquidación judicial empresa',
    resumen: 'Cuando una empresa deudora entra en reorganización, no se admiten nuevos procesos de ejecución y los existentes se remiten o suspenden. En liquidación judicial, los procesos se envían al juez del concurso.',
    normas: [
      { ref: 'Art. 20 Ley 1116 de 2006', txt: 'Desde el inicio de la reorganización no pueden admitirse ni continuarse procesos de ejecución contra el deudor.' },
      { ref: 'Art. 50 Ley 1116 de 2006', txt: 'Efectos de la liquidación judicial sobre los procesos de ejecución.', v: true },
      { ref: 'Art. 818 Estatuto Tributario', txt: 'La admisión a reorganización interrumpe la prescripción.' }
    ],
    reglas: ['Presente la acreencia ante la Superintendencia o el juez.', 'Distinga obligaciones anteriores y posteriores al inicio.'],
    revisar: ['Auto de admisión', 'Fecha de inicio', 'Gastos de administración posteriores'],
    errores: ['Seguir embargando después de la admisión.'],
    relacionados: ['insolvencia'],
    oficios: [
      { codigo: 'INFORMA_REORGANIZACION', nombre: 'Informa efectos de la reorganización', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual informa la admisión del deudor del proceso {{EXPEDIENTE}} a un proceso de reorganización, esta Dirección da respuesta en los siguientes términos:',
        'El artículo 20 de la Ley 1116 de 2006 dispone que, a partir del inicio del proceso de reorganización, no podrán admitirse ni continuarse demandas de ejecución o cualquier otro proceso de cobro contra el deudor.',
        'En consecuencia, esta Dirección suspenderá el proceso de cobro respecto de las obligaciones causadas antes del inicio de la reorganización y hará valer su acreencia dentro del proceso concursal. Las obligaciones que se causen con posterioridad se rigen por las reglas de los gastos de administración.'
      ]}
    ]
  },

  {
    id: 'victimas', cat: 'especiales', cartera: ['Predial'], frecuencia: 'baja', competencia: 'ajena',
    titulo: 'Víctimas del conflicto: alivio de predial',
    claves: 'víctima conflicto armado despojo desplazamiento ley 1448 alivio predial',
    resumen: 'La Ley de Víctimas prevé que los municipios adopten sistemas de alivio o exoneración del predial para predios restituidos o afectados. Su reconocimiento es de Hacienda o Rentas según el acuerdo municipal; la Dirección traslada y suspende si se acredita.',
    normas: [
      { ref: 'Art. 121 Ley 1448 de 2011', txt: 'Mecanismos de alivio y exoneración de la cartera de impuesto predial para víctimas, que deben adoptar las entidades territoriales.' },
      { ref: 'Acuerdo municipal de Bello que adopta el alivio', txt: 'Confirme si existe y qué dependencia lo reconoce.', v: true }
    ],
    reglas: ['Traslade a la dependencia que reconoce el beneficio.', 'Evite medidas sobre el predio mientras se decide.'],
    revisar: ['Inscripción en el RUV', 'Relación del predio con el hecho victimizante'],
    errores: ['Negar de plano sin verificar el acuerdo.'],
    relacionados: ['exencion-predial', 'traslado-competencia'],
    oficios: [
      { codigo: 'TRASLADA_ALIVIO_VICTIMAS', nombre: 'Traslada solicitud de alivio a Rentas', decision: 'traslada', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita alivio o exoneración del impuesto predial del inmueble con matrícula {{MATRICULA}} en su condición de víctima del conflicto armado, esta Dirección le informa lo siguiente:',
        'El artículo 121 de la Ley 1448 de 2011 prevé que las entidades territoriales adopten sistemas de alivio o exoneración de la cartera del impuesto predial a favor de las víctimas. El reconocimiento de ese beneficio corresponde a la dependencia encargada de la administración del impuesto, conforme al acuerdo municipal que lo regula.',
        'Por lo anterior, con fundamento en el artículo 21 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, **su petición fue trasladada a {{ENTIDAD_DESTINO}}** mediante radicado {{RAD_TRASLADO}}. Mientras se decide su solicitud, esta Dirección no adelantará nuevas medidas sobre el inmueble respecto de las vigencias objeto de la petición.'
      ]}
    ]
  },

  /* ======================= TRÁMITE DE LA PETICIÓN ======================= */
  {
    id: 'copias-expediente', cat: 'peticion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Copias del expediente',
    claves: 'copias expediente documentos fotocopias acceso consulta reserva tercero',
    resumen: 'El deudor y su apoderado tienen acceso al expediente. Las copias se entregan dentro de diez días. A terceros no se les entrega información protegida sin autorización del titular.',
    normas: [
      { ref: 'Art. 14 num. 1 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Las peticiones de documentos e información se resuelven dentro de los diez días siguientes.' },
      { ref: 'Art. 24 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Informaciones y documentos sometidos a reserva.', v: true },
      { ref: 'Ley 1581 de 2012', txt: 'Protección de datos personales de terceros.' }
    ],
    reglas: ['Envíe por correo en PDF; evita costos de reproducción.', 'Si quien pide es un tercero, verifique poder o autorización.'],
    revisar: ['Calidad del peticionario', 'Piezas solicitadas'],
    errores: ['Entregar el expediente a un tercero sin poder.'],
    relacionados: ['apoderado', 'estado-proceso'],
    oficios: [
      { codigo: 'CONCEDE_COPIAS', nombre: 'Entrega copias del expediente', decision: 'concede', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita copia de las piezas del proceso de cobro {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        '**Se accede a su solicitud**. Adjunto a la presente se remite copia digital de las piezas procesales solicitadas, de conformidad con el numeral 1 del artículo 14 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015.',
        'Si requiere consultar otras actuaciones, puede solicitarlas por este mismo medio o acercarse a las instalaciones de esta Dirección.'
      ]},
      { codigo: 'NIEGA_COPIAS_TERCERO', nombre: 'Niega copias a tercero sin autorización', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita copia del expediente {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El expediente contiene información personal y financiera del deudor, protegida por la Ley 1581 de 2012 y por las reglas de reserva del artículo 24 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015. Su consulta corresponde al titular de la información o a quien acredite actuar en su nombre.',
        'Como usted no acreditó la calidad de deudor ni de apoderado, **no es procedente entregar las copias solicitadas**. Si actúa en representación del deudor, puede presentar nuevamente su solicitud acompañada del poder o autorización correspondiente.'
      ]}
    ]
  },

  {
    id: 'estado-proceso', cat: 'peticion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'propia',
    titulo: 'Información sobre el estado del proceso',
    claves: 'estado del proceso en qué va información consulta',
    resumen: 'Respuesta informativa sobre la etapa del proceso, el valor y las alternativas del deudor.',
    normas: [
      { ref: 'Art. 14 num. 1 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Diez días para información.' }
    ],
    reglas: ['Sea concreto con la etapa.', 'Cierre siempre con las alternativas: pagar, acuerdo, consultar expediente.'],
    revisar: ['Última actuación', 'Valor a la fecha'],
    errores: ['Respuestas genéricas sin etapa real.'],
    relacionados: ['mandamiento-pago', 'estado-cuenta'],
    oficios: [
      { codigo: 'INFORMA_ESTADO_PROCESO', nombre: 'Informa etapa del proceso', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita información sobre el proceso de cobro coactivo {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'El proceso se adelanta con base en la resolución n.º {{NUM_RESOLUCION}} del {{FECHA_RESOLUCION}} y actualmente se encuentra {{ESTADO_PROCESO}}.',
        'A la fecha de corte {{FECHA_CORTE}}, el valor de la obligación asciende a {{VALOR_DEUDA}}. Para terminar el proceso puede pagar la totalidad de la deuda o solicitar un acuerdo de pago. Si desea copia de alguna actuación, puede solicitarla por este mismo medio.'
      ]}
    ]
  },

  {
    id: 'traslado-competencia', cat: 'peticion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'alta', competencia: 'ajena',
    titulo: 'Traslado por competencia',
    claves: 'traslado competencia no es de la dirección remitir otra entidad',
    resumen: 'Si la petición es de otra dependencia o entidad, se traslada dentro de cinco días hábiles y se avisa al peticionario. Los traslados no cuentan como respuesta de fondo.',
    normas: [
      { ref: 'Art. 21 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Si la autoridad no es competente, informa al peticionario dentro de los cinco días siguientes y remite la petición al competente con copia al interesado.' }
    ],
    reglas: ['Cuente los 5 días desde la radicación.', 'Registre el radicado de salida en Teodoro (pestaña Trasladadas).'],
    revisar: ['Entidad competente correcta'],
    errores: ['Responder de fondo algo ajeno.', 'Trasladar después de los 5 días.'],
    relacionados: ['no-infractor', 'fondo-multa', 'avaluo-catastral', 'exencion-predial'],
    oficios: [
      { codigo: 'TRASLADA_COMPETENCIA', nombre: 'Traslado genérico por competencia', decision: 'traslada', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, esta Dirección le informa lo siguiente:',
        'Revisado el contenido de su solicitud, se encontró que el asunto no corresponde a las funciones de esta Dirección, encargada del cobro coactivo de las obligaciones a favor del Municipio, sino a {{ENTIDAD_DESTINO}}.',
        'Por lo anterior, de conformidad con el artículo 21 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, **su petición fue trasladada a {{ENTIDAD_DESTINO}}** mediante radicado {{RAD_TRASLADO}}, entidad que le dará respuesta de fondo dentro de los términos de ley.'
      ]}
    ]
  },

  {
    id: 'peticion-incompleta', cat: 'peticion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Petición incompleta y desistimiento tácito',
    claves: 'incompleta falta información requerir desistimiento tácito un mes',
    resumen: 'Si falta información para decidir, se requiere al peticionario dentro de los diez días siguientes; tiene un mes para completarla. Si no responde, se decreta el desistimiento tácito.',
    normas: [
      { ref: 'Art. 17 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Requerimiento dentro de los diez días; un mes para completar, prorrogable hasta por un mes más; vencido el plazo, desistimiento tácito por acto motivado.' }
    ],
    reglas: ['Requiera solo lo indispensable.', 'El término de respuesta se reanuda cuando el peticionario aporta lo pedido.', 'El desistimiento no impide presentar de nuevo la petición.'],
    revisar: ['Qué falta exactamente', 'Fecha del requerimiento'],
    errores: ['Requerir después de los 10 días.'],
    relacionados: ['apoderado', 'pago-no-aplicado'],
    oficios: [
      { codigo: 'REQUIERE_COMPLETAR', nombre: 'Requiere completar la petición', decision: 'requiere', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, esta Dirección le informa lo siguiente:',
        'Para resolver de fondo su solicitud es necesario que aporte: {{DOCUMENTOS_FALTANTES}}.',
        'De conformidad con el artículo 17 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, cuenta con un (1) mes para allegar lo requerido. El término para resolver su petición se reanudará a partir del día siguiente a que aporte la información.',
        'Si no completa la petición dentro de ese plazo, se entenderá que ha desistido de ella, salvo que antes de su vencimiento solicite prórroga hasta por un término igual.'
      ]},
      { codigo: 'INFORMA_DESISTIMIENTO_TACITO', nombre: 'Decreta desistimiento tácito', decision: 'informa', parrafos: [
        'En relación con su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, esta Dirección le informa lo siguiente:',
        'Mediante comunicación anterior se le requirió para que aportara {{DOCUMENTOS_FALTANTES}}, con el fin de resolver de fondo su solicitud. El plazo de un (1) mes previsto en el artículo 17 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, venció sin que se allegara lo requerido ni se solicitara prórroga.',
        'En consecuencia, **se entiende que ha desistido de su petición** y se ordena su archivo. Lo anterior no le impide presentar una nueva solicitud con el lleno de los requisitos.'
      ]}
    ]
  },

  {
    id: 'peticion-reiterativa', cat: 'peticion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Petición reiterativa',
    claves: 'reiterativa repetida misma petición ya se respondió',
    resumen: 'Si la misma petición ya fue resuelta y no hay hechos nuevos, puede remitirse a la respuesta anterior. Hay que verificar que de verdad sea idéntica.',
    normas: [
      { ref: 'Art. 19 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Respecto de peticiones reiterativas ya resueltas, la autoridad puede remitirse a las respuestas anteriores, salvo que se trate de derechos imprescriptibles o de peticiones que se hubieren negado por no acreditar requisitos.' }
    ],
    reglas: ['Compare hechos y pretensiones con la respuesta anterior.', 'Si aporta hechos o pruebas nuevas, responda de fondo.', 'Considere revisar de oficio la prescripción por el paso del tiempo.'],
    revisar: ['Respuesta anterior y su notificación', 'Hechos nuevos'],
    errores: ['Usarlo cuando la petición anterior se negó por falta de requisitos ya subsanados.'],
    relacionados: [],
    oficios: [
      { codigo: 'INFORMA_PETICION_REITERATIVA', nombre: 'Remite a la respuesta anterior', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, relacionada con el proceso {{EXPEDIENTE}}, esta Dirección da respuesta en los siguientes términos:',
        'Revisados los registros, se encontró que una solicitud con el mismo objeto y fundamentos fue resuelta de fondo mediante comunicación con radicado {{RAD_RESPUESTA_ANTERIOR}} del {{FECHA_PETICION_ANTERIOR}}, debidamente remitida a usted.',
        'Como en su nueva petición no se exponen hechos ni se aportan pruebas distintas de las ya valoradas, de conformidad con el artículo 19 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, **esta Dirección se remite a la respuesta anterior**, cuya copia se adjunta.'
      ]}
    ]
  },

  {
    id: 'apoderado', cat: 'peticion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Apoderado sin poder',
    claves: 'apoderado abogado poder representación tramitador gestor',
    resumen: 'Cualquier persona puede presentar una petición, pero para actuar en nombre del deudor dentro del proceso o recibir su información se necesita poder. Si falta, se requiere.',
    normas: [
      { ref: 'Art. 5 Ley 1437 de 2011', txt: 'Toda persona puede actuar ante las autoridades directamente o por medio de apoderado.' },
      { ref: 'Art. 74 Código General del Proceso', txt: 'Requisitos del poder.' },
      { ref: 'Art. 17 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Requerimiento para completar.' }
    ],
    reglas: ['Si el escrito plantea temas de fondo del proceso, requiera poder antes de decidir.', 'Peticiones informativas generales pueden responderse sin poder, sin datos reservados.'],
    revisar: ['Poder y su presentación', 'Tarjeta profesional si es abogado'],
    errores: ['Decidir excepciones presentadas por quien no acredita representación.'],
    relacionados: ['copias-expediente', 'peticion-incompleta'],
    oficios: [
      { codigo: 'REQUIERE_PODER', nombre: 'Requiere poder al apoderado', decision: 'requiere', parrafos: [
        'En atención a la petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, presentada en nombre de {{PETICIONARIO}} dentro del proceso {{EXPEDIENTE}}, esta Dirección le informa lo siguiente:',
        'Para actuar en representación del deudor dentro del proceso de cobro, o para acceder a su información, es necesario acreditar dicha representación mediante poder otorgado conforme al artículo 74 del Código General del Proceso, o autorización expresa del titular.',
        'Por lo anterior, de conformidad con el artículo 17 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, le pedimos aportar el poder correspondiente dentro del mes siguiente. Si no lo hace, se entenderá que desistió de la solicitud.'
      ]}
    ]
  },

  {
    id: 'ampliacion-termino', cat: 'peticion', cartera: ['Tránsito', 'Predial', 'ICA'], frecuencia: 'media', competencia: 'propia',
    titulo: 'Ampliación del término para responder',
    claves: 'ampliación prórroga término no alcanzo a responder',
    resumen: 'Cuando no es posible responder a tiempo, debe informarse antes del vencimiento, con el motivo y la fecha en que se responderá, que no puede exceder el doble del término inicial.',
    normas: [
      { ref: 'Parágrafo art. 14 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Si no es posible resolver en los plazos, se informa al interesado antes del vencimiento, con los motivos y el plazo razonable, que no puede exceder del doble del inicialmente previsto.' }
    ],
    reglas: ['Debe enviarse antes del vencimiento.', 'Registre la nueva fecha límite en Teodoro.'],
    revisar: ['Fecha de vencimiento original', 'Nueva fecha (máximo el doble)'],
    errores: ['Enviar la ampliación cuando ya venció el término.'],
    relacionados: [],
    oficios: [
      { codigo: 'INFORMA_AMPLIACION_TERMINO', nombre: 'Informa ampliación del término', decision: 'informa', parrafos: [
        'En relación con su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, esta Dirección le informa lo siguiente:',
        'Para dar una respuesta de fondo a su solicitud {{MOTIVO_AMPLIACION}}, razón por la cual no es posible resolverla dentro del término inicialmente previsto.',
        'En consecuencia, de conformidad con el parágrafo del artículo 14 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, le informamos que **su petición será resuelta a más tardar el {{FECHA_NUEVA_RESPUESTA}}**.'
      ]}
    ]
  },

  /* ======================= FUERA DE COBRO COACTIVO ======================= */
  {
    id: 'fondo-multa', cat: 'fuera', cartera: ['Tránsito'], frecuencia: 'alta', competencia: 'ajena',
    titulo: 'Discutir la legalidad del comparendo o la fotomulta',
    claves: 'fotomulta cámara no estaba señalizada comparendo injusto ilegal impugnar audiencia c-038',
    resumen: 'El cobro coactivo no revisa si la sanción fue justa ni si la cámara estaba bien señalizada: eso se discute ante la autoridad de tránsito, en la etapa contravencional o mediante revocatoria directa. Aquí solo se explica y, si corresponde, se traslada.',
    normas: [
      { ref: 'Art. 829-1 Estatuto Tributario', txt: 'En el cobro coactivo no pueden debatirse cuestiones que debieron ser objeto de discusión en la vía administrativa.' },
      { ref: 'Art. 831 Estatuto Tributario', txt: 'Las excepciones son taxativas y no incluyen la legalidad de la sanción.' },
      { ref: 'Ley 1843 de 2017 y Sentencia C-038 de 2020', txt: 'Régimen de detección electrónica de infracciones y responsabilidad personal del infractor.' }
    ],
    reglas: ['Si pide revocar la sanción, use el traslado de revocatoria.', 'Si solo protesta, use la negativa explicativa.', 'Revise de oficio prescripción y caducidad antes de responder.'],
    revisar: ['Prescripción y caducidad de oficio', 'Si pide revocatoria expresamente'],
    errores: ['Entrar a valorar la señalización o la prueba de la infracción.'],
    relacionados: ['revocatoria-directa', 'caducidad-transito', 'no-infractor', 'simit-runt'],
    oficios: [
      { codigo: 'NIEGA_DISCUSION_FONDO', nombre: 'Explica que el fondo no se discute en cobro', decision: 'niega', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, en la que controvierte la imposición del comparendo n.º {{COMPARENDO}}, esta Dirección da respuesta en los siguientes términos:',
        'Esta Dirección tiene a su cargo el cobro de obligaciones contenidas en actos administrativos ejecutoriados. La revisión de la legalidad de la sanción, de las pruebas de la infracción y de las circunstancias en que se impuso el comparendo corresponde a la autoridad de tránsito, dentro de la actuación contravencional.',
        'El artículo 829-1 del Estatuto Tributario dispone que en el procedimiento de cobro no pueden debatirse cuestiones que debieron ser objeto de discusión en la vía administrativa. Por ello, **no es procedente estudiar en este proceso los argumentos expuestos** sobre la imposición de la sanción.',
        'Sin perjuicio de lo anterior, se revisó de oficio la obligación y no se encontró causal de prescripción ni de caducidad. Si considera que la sanción debe ser revocada, puede presentar la solicitud correspondiente ante la Secretaría de Movilidad.'
      ]},
      { codigo: 'TRASLADA_MOVILIDAD', nombre: 'Traslada a Movilidad', decision: 'traslada', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, relacionada con el comparendo n.º {{COMPARENDO}}, esta Dirección le informa lo siguiente:',
        'Los asuntos planteados en su solicitud se refieren a la actuación contravencional de tránsito, cuya competencia corresponde a la Secretaría de Movilidad del Municipio de Bello y no a esta Dirección, encargada exclusivamente del cobro coactivo.',
        'En consecuencia, con fundamento en el artículo 21 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, **su petición fue trasladada a {{ENTIDAD_DESTINO}}** mediante radicado {{RAD_TRASLADO}}, para que le dé respuesta de fondo.'
      ]}
    ]
  },

  {
    id: 'avaluo-catastral', cat: 'fuera', cartera: ['Predial'], frecuencia: 'media', competencia: 'ajena',
    titulo: 'Revisión del avalúo catastral',
    claves: 'avalúo catastral muy alto revisión área destinación catastro',
    resumen: 'El avalúo, el área o la destinación del predio los define la autoridad catastral. La Dirección no puede modificarlos; traslada la petición. Si el avalúo cambia, Rentas reliquida y el cobro se ajusta.',
    normas: [
      { ref: 'Normas de gestión catastral (Ley 14 de 1983 y art. 79 Ley 1955 de 2019)', txt: 'La revisión del avalúo corresponde al gestor catastral competente.', v: true },
      { ref: 'Art. 21 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Traslado por competencia.' }
    ],
    reglas: ['Confirme cuál es el gestor catastral competente para Bello.', 'La solicitud de revisión no suspende el cobro.'],
    revisar: ['Gestor catastral de Bello'],
    errores: ['Prometer reliquidación desde la Dirección.'],
    relacionados: ['exencion-predial', 'traslado-competencia'],
    oficios: [
      { codigo: 'TRASLADA_AVALUO', nombre: 'Traslada revisión de avalúo al gestor catastral', decision: 'traslada', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la revisión del avalúo catastral del inmueble con matrícula {{MATRICULA}}, esta Dirección le informa lo siguiente:',
        'La fijación y revisión de los avalúos catastrales corresponde a la autoridad catastral competente y no a esta Dirección, que tiene a su cargo el cobro coactivo del impuesto liquidado con base en dichos avalúos.',
        'Por lo anterior, con fundamento en el artículo 21 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, **su petición fue trasladada a {{ENTIDAD_DESTINO}}** mediante radicado {{RAD_TRASLADO}}. Si como resultado de la revisión se modifica el avalúo, el impuesto será reliquidado y el cobro se ajustará al nuevo valor.'
      ]}
    ]
  },

  {
    id: 'exencion-predial', cat: 'fuera', cartera: ['Predial', 'ICA'], frecuencia: 'media', competencia: 'ajena',
    titulo: 'Exenciones, exclusiones y liquidaciones oficiales',
    claves: 'exención exonerado iglesia junta de acción comunal declaración ica liquidación oficial rentas',
    resumen: 'Reconocer exenciones, corregir liquidaciones, revisar declaraciones de ICA o expedir facturas son funciones de la Dirección de Rentas. La Dirección traslada y espera el acto que modifique el título.',
    normas: [
      { ref: 'Estatuto Tributario de Bello', txt: 'Exenciones y competencia de la Dirección de Rentas.', v: true },
      { ref: 'Art. 21 Ley 1437 de 2011, sustituido por Ley 1755 de 2015', txt: 'Traslado por competencia.' }
    ],
    reglas: ['Traslade a Rentas (Doroteo).', 'Si Rentas modifica el título, ajuste el cobro.'],
    revisar: ['Que no esté ya reconocida la exención'],
    errores: ['Decidir exenciones desde cobro coactivo.'],
    relacionados: ['avaluo-catastral', 'victimas'],
    oficios: [
      { codigo: 'TRASLADA_RENTAS', nombre: 'Traslada a la Dirección de Rentas', decision: 'traslada', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, relacionada con la determinación del impuesto a su cargo, esta Dirección le informa lo siguiente:',
        'El reconocimiento de exenciones, la corrección de liquidaciones y la revisión de declaraciones son funciones de la Dirección de Rentas Municipales. Esta Dirección tiene a su cargo únicamente el cobro coactivo de las obligaciones ya determinadas.',
        'Por lo anterior, con fundamento en el artículo 21 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015, **su petición fue trasladada a {{ENTIDAD_DESTINO}}** mediante radicado {{RAD_TRASLADO}}. Si como resultado de su estudio se modifica la obligación, el proceso de cobro se ajustará a lo decidido.'
      ]}
    ]
  },

  {
    id: 'simit-runt', cat: 'fuera', cartera: ['Tránsito'], frecuencia: 'alta', competencia: 'limitada',
    titulo: 'Actualización en SIMIT y RUNT',
    claves: 'simit runt no se ha actualizado sigue apareciendo plataforma licencia',
    resumen: 'La Dirección reporta las novedades del cobro (pago, prescripción, terminación) y la actualización en las plataformas la ejecuta el organismo de tránsito. Se informa qué se reportó y a quién acudir.',
    normas: [
      { ref: 'Ley 769 de 2002 y normas del SIMIT', txt: 'El reporte de multas y su actualización está a cargo de los organismos de tránsito.', v: true }
    ],
    reglas: ['Confirme que la novedad ya se reportó y en qué fecha.', 'Indique la dependencia que carga la novedad en SIMIT.'],
    revisar: ['Fecha del reporte de la novedad'],
    errores: ['Prometer plazos de actualización que no controla la Dirección.'],
    relacionados: ['pago-no-aplicado', 'prescripcion-transito'],
    oficios: [
      { codigo: 'INFORMA_ACTUALIZACION_SIMIT', nombre: 'Informa reporte de novedad para SIMIT', decision: 'informa', parrafos: [
        'En atención a su petición radicada con el número {{RADICADO}} del {{FECHA_RADICACION}}, mediante la cual solicita la actualización del estado del comparendo n.º {{COMPARENDO}} en las plataformas de tránsito, esta Dirección le informa lo siguiente:',
        'Esta Dirección reportó la novedad correspondiente a la obligación del comparendo n.º {{COMPARENDO}}. La actualización de la información en el Sistema Integrado de Información sobre Multas y Sanciones por Infracciones de Tránsito (SIMIT) la realiza el organismo de tránsito con base en dicho reporte.',
        'Si pasados algunos días la información no se ha actualizado, puede acudir a {{ENTIDAD_DESTINO}} con copia de esta comunicación para solicitar el cargue de la novedad.'
      ]}
    ]
  }

  ]
};
