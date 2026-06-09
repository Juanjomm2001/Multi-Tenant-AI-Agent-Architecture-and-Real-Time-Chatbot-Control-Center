import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos el Service Role Key para poder insertar en customers sin restricciones de RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, tenant_id, session_id } = body;

        if (!name || !email || !tenant_id || !session_id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Insertar en la tabla customers
        const { data, error } = await supabaseAdmin
            .from('customers')
            .insert({
                tenant_id: tenant_id,
                external_id: session_id, // Usamos el session_id generado aleatoriamente como external_id
                name: name,
                email: email,
                metadata: { source: "demo_widget" }
            })
            .select('id')
            .single();

        if (error) {
            console.error("Error creating customer:", error);
            // Si hay error de llave duplicada, lo ignoramos y buscamos al cliente
            if (error.code === '23505') {
                 const { data: existingData } = await supabaseAdmin
                    .from('customers')
                    .select('id')
                    .eq('tenant_id', tenant_id)
                    .eq('external_id', session_id)
                    .single();
                 
                 return NextResponse.json({ customer_id: existingData?.id });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ customer_id: data.id });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
