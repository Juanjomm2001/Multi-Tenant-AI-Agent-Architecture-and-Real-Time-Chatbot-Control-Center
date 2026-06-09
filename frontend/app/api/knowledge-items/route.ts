import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // En este endpoint no necesitamos propagar cambios de cookies
        setAll() {
          return;
        },
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });
    }

    const profileRes = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileRes.error || !profileRes.data?.tenant_id) {
      return NextResponse.json({ error: "No se ha encontrado tenant para el usuario" }, { status: 400 });
    }

    const tenantId = profileRes.data.tenant_id as string;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichero no proporcionado" }, { status: 400 });
    }

    const bucket = "knowledge-items";
    // Sanitize filename: replace spaces and special characters with underscores, keep alphanumeric and dots
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-]/g, "_");
    const filePath = `${tenantId}/${Date.now()}-${sanitizedFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: "Error subiendo el fichero a Storage", details: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const fileUrl = publicUrlData.publicUrl;

    const { data: inserted, error: insertError } = await supabase
      .from("knowledge_items")
      .insert({
        tenant_id: tenantId,
        filename: file.name,
        file_url: fileUrl,
        status: "processing",
        metadata: {
          size: file.size,
          storage_path: filePath,
        },
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Error insertando en knowledge_items", details: insertError.message }, { status: 500 });
    }

    const pythonApiUrl = process.env.PYTHON_API_URL || "http://127.0.0.1:8000";
    const ingestUrl = `${pythonApiUrl}/api/v1/ingest`;

    try {
      void fetch(ingestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          knowledge_item_id: inserted.id,
          file_url: fileUrl,
          metadata: inserted.metadata ?? {},
        }),
      }).catch((err) => {
        console.error("Error enviando documento al backend de Python:", err);
      });
    } catch (err) {
      console.error("Error al iniciar fetch hacia Python:", err);
    }

    return NextResponse.json({ item: inserted }, { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/knowledge-items:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
    }

    // Obtenemos el item para conocer tenant y storage_path
    const { data: item, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, tenant_id, filename, file_url, metadata")
      .eq("id", id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: "Elemento no encontrado" }, { status: 404 });
    }

    const storagePath = (item.metadata as any)?.storage_path as string | undefined;

    if (storagePath) {
      await supabase.storage.from("knowledge-items").remove([storagePath]);
    }

    // 3. Borramos el registro de la tabla knowledge_items
    // Gracias al trigger 'ON DELETE CASCADE' que configuramos en 'documents_setup.sql',
    // esto borrará automáticamente todos sus vectores asociados en la tabla 'documents'.
    const { error: deleteError } = await supabase
      .from("knowledge_items")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: "Error eliminando el conocimiento", details: deleteError.message }, { status: 500 });
    }

    // 4. Borramos manualmente los embeddings de la tabla documents
    const { error: vectorError } = await supabase
      .from("documents")
      .delete()
      .eq("metadata->>knowledge_item_id", id);

    if (vectorError) {
      console.error("Error borrando vectores:", vectorError);
      // No cortamos la ejecución, el archivo ya está borrado
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en DELETE /api/knowledge-items:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

