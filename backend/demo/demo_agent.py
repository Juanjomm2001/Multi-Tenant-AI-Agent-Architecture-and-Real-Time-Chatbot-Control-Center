import os
from supabase_client import get_supabase_client

DEFAULT_COSECHADOS_INFO = """"""

class DemoRAGAgent:
    def __init__(self):
        # 1. Configurar LLM: Soporta Gemini (recomendado) o fallback a OpenAI
        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        
        if self.gemini_key:
            # Usar Gemini de Google
            from langchain_google_genai import ChatGoogleGenerativeAI
            self.llm = ChatGoogleGenerativeAI(
                model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                google_api_key=self.gemini_key,
                temperature=0
            )
            print("[DemoRAGAgent] Inicializado con Google Gemini LLM.")
        else:
            # Usar API compatible con OpenAI como fallback
            from langchain_openai import ChatOpenAI
            self.llm = ChatOpenAI(
                api_key=os.getenv("CAMPUSAI_API_KEY"),
                base_url=os.getenv("CAMPUSAI_API_URL"),
                model=os.getenv("CAMPUSAI_MODEL"),
                temperature=0
            )
            print("[DemoRAGAgent] Inicializado con OpenAI-Compatible LLM.")
            
        self.supabase = get_supabase_client()
        
        # 2. Cargar contexto de la demo (lee de archivo local si existe, si no, usa el string por defecto)
        self.info_file_path = os.path.join(os.path.dirname(__file__), "cosechados_info.txt")
        self._load_info_context()

    def _load_info_context(self):
        if os.path.exists(self.info_file_path):
            try:
                with open(self.info_file_path, "r", encoding="utf-8") as f:
                    self.cosechados_info = f.read()
                print(f"[DemoRAGAgent] Información cargada desde archivo local: {self.info_file_path}")
            except Exception as e:
                print(f"[DemoRAGAgent] Error leyendo archivo. Usando datos por defecto. Detalle: {e}")
                self.cosechados_info = DEFAULT_COSECHADOS_INFO
        else:
            # Crear el archivo local con el contenido por defecto para facilitar que el usuario lo edite
            try:
                with open(self.info_file_path, "w", encoding="utf-8") as f:
                    f.write(DEFAULT_COSECHADOS_INFO.strip())
                print(f"[DemoRAGAgent] Creado archivo de información local editable en: {self.info_file_path}")
            except Exception as e:
                print(f"[DemoRAGAgent] No se pudo escribir archivo local. Detalle: {e}")
            self.cosechados_info = DEFAULT_COSECHADOS_INFO

    def ask(self, tenant_id: str, session_id: str, customer_id: str, query: str, history: list) -> dict:
        # Recargar el archivo de texto en cada consulta por si el usuario lo editó en caliente sin reiniciar el backend
        if os.path.exists(self.info_file_path):
            try:
                with open(self.info_file_path, "r", encoding="utf-8") as f:
                    self.cosechados_info = f.read()
            except Exception:
                pass

        # 1. Guardar mensaje del usuario en la base de datos de auditoría
        self._save_message(tenant_id, session_id, customer_id, "user", query)

        # Obtener el nombre del cliente registrado desde Supabase
        customer_name = "Cliente"
        if customer_id:
            try:
                res = self.supabase.table("customers").select("name").eq("id", customer_id).execute()
                if res.data:
                    customer_name = res.data[0].get("name", "Cliente")
            except Exception as e:
                print(f"[DemoRAGAgent] Error obteniendo el nombre del cliente: {e}")

        # 2. Formatear el historial de chat
        history_str = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in history]) if history else "No anterior context."
        
        # 3. Prompt inyectando el archivo de texto directamente como contexto (saltándonos embeddings/VPN)
        prompt = (
            f"Eres el asistente virtual interactivo de la frutería online Cosechados.\n"
            f"Tu misión es responder preguntas del usuario de forma útil, natural y directa al grano, además de tomar y gestionar sus pedidos.\n\n"
            
            f"TOMA DE PEDIDOS (PROCESO DE VENTA):\n"
            f"- Tienes la capacidad de registrar pedidos en esta conversación. Para que un pedido esté completo necesitas obligatoriamente 3 datos:\n"
            f"  1. Nombre del cliente: Usa el nombre del cliente registrado en el sistema, que es '{customer_name}'. Si el cliente prefiere otro o no está definido, pídeselo.\n"
            f"  2. Productos y cantidades: Qué frutas, verduras o productos del inventario desea y cuánta cantidad (en Kg o unidades) de cada uno.\n"
            f"  3. Dirección de entrega: La calle, número y ciudad donde desea recibir el pedido.\n"
            f"- Si el usuario indica que desea hacer un pedido o comprar algo, analiza qué datos de los 3 te faltan y pídeselos de forma muy amable e interactiva.\n"
            f"- Una vez tengas los 3 datos completos, debes presentar obligatoriamente un RESUMEN detallado del pedido (con productos, cantidades, precios del inventario, y el coste de envío correspondiente según el total) y pedirle CONFIRMACIÓN EXPLÍCITA (por ejemplo: '¿Me confirmas si todo está correcto para tramitar tu pedido?').\n"
            f"- Cuando el usuario confirme explícitamente que todo es correcto:\n"
            f"  * Simula que el pedido ha sido realizado con éxito.\n"
            f"  * Proporciona un número de seguimiento aleatorio inventado con el formato 'COS-XXXXX' (donde XXXXX sean 5 caracteres alfanuméricos aleatorios en mayúsculas, ej: COS-489AL).\n"
            f"  * Aclara amablemente que no se le cobrará nada real ya que esto es una simulación de demostración comercial.\n\n"
            
            f"DISEÑO DE LAS RESPUESTAS Y FORMATO (INSTRUCCIONES DE OBLIGADO CUMPLIMIENTO):\n"
            f"- Haz las respuestas lo más legibles y estructuradas posible.\n"
            f"- NUNCA escribas una lista de productos en una sola línea o párrafo largo.\n"
            f"- CADA PRODUCTO o elemento de la lista debe comenzar en una LÍNEA NUEVA (usando un salto de línea '\\n'). Por ejemplo:\n"
            f"  Productos disponibles:\n"
            f"  - **Naranjas**: 2.20€/Kg (Origen: Valencia)\n"
            f"  - **Tomates**: 3.45€/Kg (Origen: Murcia)\n"
            f"- Usa saltos de línea dobles ('\\n\\n') para separar los distintos apartados o ideas de tu respuesta.\n"
            f"- Resalta precios y datos importantes en negrita estándar '**', pero no abuses de ella.\n"
            f"- PROHIBICIÓN CRÍTICA: NUNCA utilices símbolos de tres asteriscos ('***') en tus respuestas. Usa únicamente negrita simple '**' o texto normal. Tampoco utilices otros símbolos extraños que entorpezcan la lectura.\n\n"
            
            f"INSTRUCCIÓN DE IDIOMA: Responde en el MISMO IDIOMA en el que el usuario te pregunte.\n\n"
            f"Información Oficial de Cosechados (Logística, Precios e Inventario):\n{self.cosechados_info}\n\n"
            f"Historial de conversación:\n{history_str}\n\n"
            f"Pregunta o acción del usuario: {query}"
        )
        
        # 4. Obtener respuesta del LLM (Gemini u OpenAI)
        try:
            response = self.llm.invoke(prompt)
            answer = response.content
        except Exception as e:
            print(f"[DemoRAGAgent] Error al invocar el LLM: {e}")
            answer = "Lo siento, tengo problemas de conexión temporal para procesar tu respuesta. Por favor, inténtalo de nuevo."

        # Limpieza de seguridad de formato (reemplazar triple asterisco si el LLM se salta la regla)
        if answer:
            answer = answer.replace("***", "**")

        # 5. Guardar la respuesta del asistente en Supabase
        citations = ["demo_info_file"]
        self._save_message(tenant_id, session_id, customer_id, "assistant", answer, citations)

        return {
            "answer": answer,
            "citations": citations
        }

    def _save_message(self, tenant_id: str, session_id: str, customer_id: str, role: str, content: str, citations: list = None):
        """Asegura la existencia de la conversación y registra el mensaje."""
        try:
            conv_res = self.supabase.table("conversations").select("id").eq("session_id", session_id).execute()
            
            if not conv_res.data:
                data = {"session_id": session_id, "tenant_id": tenant_id}
                if customer_id:
                    data["customer_id"] = customer_id
                new_conv = self.supabase.table("conversations").insert(data).execute()
                conv_id = new_conv.data[0]["id"]
            else:
                conv_id = conv_res.data[0]["id"]
                
            msg_data = {
                "conversation_id": conv_id,
                "role": role,
                "content": content,
                "citations": citations or []
            }
            self.supabase.table("messages").insert(msg_data).execute()
        except Exception as e:
            print(f"[DemoRAGAgent] Error registrando mensaje en base de datos: {e}")
