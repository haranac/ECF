// Local integration tests. Credentials are passed in process environment, never saved.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '')
  .trim().split(/\r?\n/).map(line => { const i = line.indexOf('='); return [line.slice(0,i),line.slice(i+1)]; }));
const url = env.VITE_SUPABASE_URL;
assert.equal(url, 'http://127.0.0.1:54321', 'Tests must never target a remote database');
assert.ok(process.env.CANWASH_TEST_SERVICE_KEY, 'Pass the local service role key in the process environment');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(url, process.env.CANWASH_TEST_SERVICE_KEY, options);
const accounts = []; const clientIds = []; const agendaIds = []; const tariffRestores = [];
let oldStylist; let savedAssignments = []; let passed = 0;
const ok = async promise => { const result = await promise; if (result.error) throw new Error(result.error.message + ' [' + result.error.code + ']'); return result.data; };
const fails = async (promise, code) => { const result = await promise; assert.ok(result.error, 'Expected rejection'); if(code) assert.equal(result.error.code,code,result.error.message); return result.error; };
const test = (name, fn) => fn().then(() => { passed++; console.log('PASS ' + name); });
async function account(role) {
  const email = `appointments-${randomUUID()}@example.test`; const password = randomBytes(24).toString('hex');
  const { user } = await ok(root.auth.admin.createUser({ email,password,email_confirm:true,user_metadata:{nombre:'Prueba citas', ...(role === null ? {} : {rol:role})} }));
  accounts.push(user.id);
  const api = createClient(url,env.VITE_SUPABASE_ANON_KEY,options);
  await ok(api.auth.signInWithPassword({email,password}));
  return {api,id:user.id};
}
const petInput = (id, paquete='BANO_INTEGRAL', extras=[]) => ({id_mascota:id,paquete,extras});
const at = (day, time='08:00') => `${day}T${time}:00-06:00`;
const day = offset => { const d = new Date('2035-02-01T12:00:00Z'); d.setUTCDate(d.getUTCDate()+offset); while(d.getUTCDay()===3)d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10); };
let owner, stranger, staff, admin, address, addressB, small, medium, cat, doubleCoat, matted, cfg;
async function quote(api, pets, addressId=address) { return ok(api.rpc('cotizar_visita',{p_id_direccion:addressId,p_mascotas:pets})); }
async function reserve(api, pets, when, request=randomUUID(), addressId=address) {
  const q = await quote(api,pets,addressId);
  const params={p_inicio:when,p_id_direccion:addressId,p_mascotas:pets,p_total_esperado:q.total,p_duracion_esperada:q.duracion_minutos,p_solicitud:request};
  return {q,params,result:await api.rpc('reservar_visita',params)};
}
try {
  cfg=await ok(root.from('configuracion_negocio').select('*').single());
  assert.equal(cfg.margen_minutos,60);assert.equal(Number(cfg.pesos_por_hora),100);
  owner=await account('CLIENTE');stranger=await account('CLIENTE');staff=await account('EMPLEADO');admin=await account('ADMIN');
  const adminProfile=await ok(admin.api.from('usuarios').select('rol').single());assert.equal(adminProfile.rol,'CLIENTE');
  await ok(root.from('usuarios').update({rol:'ADMIN'}).eq('id_usuario',admin.id));
  oldStylist=await ok(root.from('estilistas').select('*').eq('activo',true).single());
  // Assigning a stylist also updates existing active appointments. Preserve
  // their original owners so tests can run alongside the local demo fixtures.
  savedAssignments=await ok(root.from('citas').select('id_cita,id_usuario'));
  await ok(admin.api.rpc('asignar_cuenta_estilista',{p_id_usuario:staff.id}));
  const ca=await ok(owner.api.from('clientes').insert({id_usuario:owner.id,nombre:'Cliente prueba A',telefono:'0000000000'}).select().single());clientIds.push(ca.id_cliente);
  const cb=await ok(stranger.api.from('clientes').insert({id_usuario:stranger.id,nombre:'Cliente prueba B',telefono:'0000000000'}).select().single());clientIds.push(cb.id_cliente);
  const createPet=async (fields={})=>ok(owner.api.from('mascotas').insert({id_cliente:ca.id_cliente,nombre:'Mascota prueba',especie:'PERRO',peso_kg:2,longitud_pelo:'CORTO',tipo_capa:'SIMPLE',estado_pelaje:'NORMAL',...fields}).select().single());
  small=await createPet();medium=await createPet({peso_kg:10});cat=await createPet({especie:'GATO',peso_kg:7});
  doubleCoat=await createPet({tipo_capa:'DOBLE'});matted=await createPet({estado_pelaje:'APELMAZADO',longitud_pelo:'LARGO'});
  address=(await ok(owner.api.from('direcciones_cliente').insert({id_cliente:ca.id_cliente,direccion:'Domicilio sintético A',latitud:19.84,longitud:-90.53}).select().single())).id_direccion;
  addressB=(await ok(stranger.api.from('direcciones_cliente').insert({id_cliente:cb.id_cliente,direccion:'Domicilio sintético B'}).select().single())).id_direccion;
  await test('distance is trusted input from staff, not from the customer',async()=>{
    await fails(owner.api.rpc('validar_distancia_direccion',{p_id_direccion:address,p_kilometros:1}),'42501');
    await fails(owner.api.from('direcciones_cliente').update({distancia_origen_km:0}).eq('id_direccion',address),'42501');
    await fails(owner.api.rpc('cotizar_visita',{p_id_direccion:address,p_mascotas:[petInput(small.id_mascota)]}),'22023');
    await ok(staff.api.rpc('validar_distancia_direccion',{p_id_direccion:address,p_kilometros:2}));
    await ok(staff.api.rpc('validar_distancia_direccion',{p_id_direccion:addressB,p_kilometros:7.5}));
  });
  await test('missing role defaults to CLIENTE; ADMIN cannot self-register',async()=>{
    const a=await account(null);assert.equal((await ok(a.api.from('usuarios').select('rol').single())).rol,'CLIENTE');
    await ok(owner.api.from('usuarios').update({rol:'ADMIN'}).eq('id_usuario',owner.id));
    assert.equal((await ok(owner.api.from('usuarios').select('rol').single())).rol,'CLIENTE');
  });
  await test('weight boundaries and cat pricing',async()=>{
    for(const [weight,size] of [[4.99,'CHICO'],[5,'MEDIANO'],[15,'GRANDE'],[30,'GIGANTE']])assert.equal(await ok(owner.api.rpc('tamano_por_peso',{p_peso:weight})),size);
    await fails(owner.api.rpc('tamano_por_peso',{p_peso:0}),'22023');
    assert.equal((await quote(owner.api,[petInput(cat.id_mascota)])).subtotal_banos,150);
  });
  const two=[petInput(small.id_mascota,'BANO_INTEGRAL',['ASUNTOL']),petInput(medium.id_mascota)];
  await test('administration enforces discount caps and customer permissions',async()=>{
    await fails(admin.api.from('descuentos_mascotas').update({porcentaje:16}).eq('minimo_mascotas',2),'23514');
    await fails(admin.api.from('descuentos_mascotas').update({porcentaje:1}).eq('minimo_mascotas',1),'23514');
    await ok(owner.api.from('configuracion_negocio').update({precio_kilometro:0}).eq('id',true));
    assert.equal(Number((await ok(root.from('configuracion_negocio').select('precio_kilometro').single())).precio_kilometro),10);
    const data=await ok(admin.api.from('usuarios').select('id_usuario,rol,activo'));assert.ok(data.length>=4);
  });
  await test('discount excludes extras; duration includes full service and visit before discount',async()=>{
    const q=await quote(owner.api,two);assert.equal(q.total,325.5);assert.equal(q.descuento,14.5);
    assert.equal(q.duracion_minutos,204);assert.equal(q.costo_visita,40);assert.equal(q.subtotal_extras,50);
    const rapado=await quote(owner.api,[petInput(small.id_mascota,'BANO_RAPADO'),petInput(medium.id_mascota,'BANO_RAPADO')]);
    assert.equal(rapado.subtotal_banos,250);assert.equal(rapado.subtotal_extras,200);assert.equal(rapado.total,475.5);assert.equal(rapado.duracion_minutos,294);
    assert.equal((await quote(owner.api,[petInput(small.id_mascota),petInput(medium.id_mascota),petInput(cat.id_mascota)])).porcentaje_descuento,10);
    assert.equal((await quote(owner.api,[petInput(small.id_mascota),petInput(medium.id_mascota),petInput(cat.id_mascota),petInput(doubleCoat.id_mascota)])).porcentaje_descuento,15);
  });
  await test('per-kilometer travel pricing is included in duration',async()=>{
    await ok(staff.api.rpc('validar_distancia_direccion',{p_id_direccion:address,p_kilometros:7.5}));
    const q=await quote(owner.api,[petInput(small.id_mascota)]);assert.equal(q.costo_visita,75);assert.equal(q.total,175);assert.equal(q.duracion_minutos,105);
    await ok(staff.api.rpc('validar_distancia_direccion',{p_id_direccion:address,p_kilometros:2}));
  });
  await test('mandatory coat extras, valuation and incompatible selections',async()=>{
    assert.equal((await quote(owner.api,[petInput(doubleCoat.id_mascota)])).subtotal_extras,100);
    const extreme=await quote(owner.api,[petInput(matted.id_mascota,'BANO_RAPADO')]);assert.equal(extreme.subtotal_extras,500);assert.equal(extreme.requiere_valoracion,true);
    await fails(owner.api.rpc('cotizar_visita',{p_id_direccion:address,p_mascotas:[petInput(small.id_mascota,'BANO_INTEGRAL',['GARRAS'])]}),'22023');
    await fails(owner.api.rpc('cotizar_visita',{p_id_direccion:address,p_mascotas:[petInput(small.id_mascota),petInput(small.id_mascota)]}),'22023');
  });
  await test('RLS blocks another client, direct agenda writes and private helpers',async()=>{
    assert.deepEqual(await ok(stranger.api.from('mascotas').select('id_mascota').eq('id_mascota',small.id_mascota)),[]);
    await fails(stranger.api.rpc('cotizar_visita',{p_id_direccion:address,p_mascotas:[petInput(small.id_mascota)]}),'42501');
    await fails(owner.api.from('agenda_estilistas').insert({id_estilista:oldStylist.id_estilista,tipo:'BLOQUEO',inicio:at(day(1)),fin:at(day(1),'09:00'),ocupado_hasta:at(day(1),'09:00'),motivo:'Ataque'}),'42501');
    const anon=createClient(url,env.VITE_SUPABASE_ANON_KEY,options);
    await fails(anon.from('usuarios').select('id_usuario'),'42501');
  });
  await test('Wednesday closed, working hours and 15-minute start grid',async()=>{
    const w=new Date('2035-02-01T12:00:00Z');while(w.getUTCDay()!==3)w.setUTCDate(w.getUTCDate()+1);
    assert.deepEqual(await ok(owner.api.rpc('horarios_disponibles',{p_fecha:w.toISOString().slice(0,10),p_id_direccion:address,p_mascotas:two})),[]);
    for(const t of ['07:45','15:00','08:01'])await fails(Promise.resolve((await reserve(owner.api,two,at(day(0),t))).result),'22023');
    assert.deepEqual(await ok(owner.api.rpc('horarios_disponibles',{p_fecha:day(0),p_id_direccion:address,
      p_mascotas:[petInput(matted.id_mascota,'BANO_RAPADO'),petInput(doubleCoat.id_mascota,'BANO_RAPADO')]})),[]);
  });
  await test('an altered quote cannot create a partial reservation',async()=>{
    const before=await ok(root.from('agenda_estilistas').select('id_agenda'));
    await fails(owner.api.rpc('reservar_visita',{p_inicio:at(day(0)),p_id_direccion:address,p_mascotas:two,p_total_esperado:0,p_duracion_esperada:1,p_solicitud:randomUUID()}),'22023');
    assert.deepEqual(await ok(root.from('agenda_estilistas').select('id_agenda')),before);
  });
  await test('atomic multi-pet booking, frozen totals, idempotency and one-hour buffer',async()=>{
    const request=randomUUID();const b=await reserve(owner.api,two,at(day(0)),request);const id=await ok(Promise.resolve(b.result));
    assert.equal(await ok(owner.api.rpc('reservar_visita',b.params)),id);
    const visit=await ok(owner.api.from('visitas').select('*,agenda_estilistas(*)').eq('id_visita',id).single());
    assert.equal(visit.total,325.5);assert.equal(new Date(visit.agenda_estilistas.fin).getTime(),new Date(at(day(0),'11:24')).getTime());
    assert.equal((await ok(owner.api.from('citas').select('id_cita').eq('id_visita',id))).length,2);
    // The grouped screens need nested relations to remain visible through RLS.
    const screenSelect='*, clientes(nombre,telefono,email), agenda_estilistas(*,estilistas(nombre,id_usuario)), citas(*,detalle_cita(*)), pagos(*)';
    for(const session of [owner,staff,admin]){
      const screen=await ok(session.api.from('visitas').select(screenSelect).eq('id_visita',id).single());
      assert.equal(screen.clientes.nombre,'Cliente prueba A');
      assert.equal(screen.agenda_estilistas.estilistas.id_usuario,staff.id);
      assert.equal(screen.citas.length,2);assert.ok(screen.citas.every(c=>c.detalle_cita.length>0));
    }
    await fails(Promise.resolve((await reserve(owner.api,[petInput(small.id_mascota)],at(day(0),'12:15'))).result),'23P01');
    const slots=await ok(owner.api.rpc('horarios_disponibles',{p_fecha:day(0),p_id_direccion:address,p_mascotas:two}));
    assert.ok(slots.every(s=>new Date(s.inicio)>=new Date(at(day(0),'12:24'))));
    const tariff=await ok(root.from('precios_servicio').select('*,servicios!inner(codigo)').eq('servicios.codigo','BANO_INTEGRAL').eq('especie','PERRO').eq('tamano','CHICO').single());
    tariffRestores.push(tariff);await ok(admin.api.from('precios_servicio').update({precio:110,componente_bano:110}).eq('id_precio',tariff.id_precio));
    assert.equal((await ok(owner.api.from('visitas').select('total').eq('id_visita',id).single())).total,325.5);
    const preserved=await ok(owner.api.rpc('horarios_reprogramacion',{p_id_visita:id,p_fecha:day(0)}));
    assert.ok(preserved.some(s=>new Date(s.inicio).getTime()===new Date(at(day(0))).getTime()));
    assert.ok(preserved.every(s=>s.duracion_minutos===204));
    await fails(stranger.api.rpc('horarios_reprogramacion',{p_id_visita:id,p_fecha:day(0)}),'42501');
    await ok(root.from('precios_servicio').update({precio:tariff.precio,componente_bano:tariff.componente_bano}).eq('id_precio',tariff.id_precio));
    await ok(owner.api.rpc('reprogramar_visita',{p_id_visita:id,p_inicio:at(day(2))}));
    await ok(owner.api.rpc('cancelar_visita',{p_id_visita:id}));
    assert.equal((await ok(root.from('agenda_estilistas').select('activo').eq('id_agenda',visit.id_agenda).single())).activo,false);
  });
  await test('two simultaneous requests cannot reserve the same slot',async()=>{
    const pets=[petInput(small.id_mascota)];const q=await quote(owner.api,pets);
    const requests=await Promise.all([1,2].map(()=>owner.api.rpc('reservar_visita',{p_inicio:at(day(4)),p_id_direccion:address,p_mascotas:pets,p_total_esperado:q.total,p_duracion_esperada:q.duracion_minutos,p_solicitud:randomUUID()})));
    assert.equal(requests.filter(r=>!r.error).length,1);assert.equal(requests.find(r=>r.error).error.code,'23P01');
  });
  await test('manual blocks share the same overlap protection',async()=>{
    const id=await ok(staff.api.rpc('bloquear_agenda',{p_inicio:at(day(7),'09:00'),p_fin:at(day(7),'10:00'),p_motivo:'Bloqueo de prueba'}));agendaIds.push(id);
    await fails(Promise.resolve((await reserve(owner.api,[petInput(small.id_mascota)],at(day(7)))).result),'23P01');
    await ok(staff.api.rpc('liberar_bloqueo',{p_id_agenda:id}));
  });
  await test('the database constraint rejects overlaps even when bypassing RPCs',async()=>{
    const row={id_estilista:oldStylist.id_estilista,tipo:'BLOQUEO',inicio:at(day(15)),fin:at(day(15),'09:00'),ocupado_hasta:at(day(15),'09:00'),motivo:'Restricción de prueba'};
    const inserted=await ok(root.from('agenda_estilistas').insert(row).select('id_agenda').single());agendaIds.push(inserted.id_agenda);
    await fails(root.from('agenda_estilistas').insert({...row,inicio:at(day(15),'08:30'),fin:at(day(15),'09:30'),ocupado_hasta:at(day(15),'09:30')}),'23P01');
  });
  await test('a valuation cannot extend into the next reservation',async()=>{
    const first=await ok(Promise.resolve((await reserve(owner.api,[petInput(small.id_mascota)],at(day(9)))).result));
    const next=await ok(Promise.resolve((await reserve(owner.api,[petInput(small.id_mascota)],at(day(9),'10:30'))).result));
    const pets=[petInput(small.id_mascota,'BANO_RAPADO')];const q=await quote(owner.api,pets);
    await fails(staff.api.rpc('valorar_visita',{p_id_visita:first,p_mascotas:pets,p_total_aceptado:q.total}),'23P01');
    assert.equal((await ok(owner.api.from('visitas').select('total').eq('id_visita',first).single())).total,140);
    await ok(owner.api.rpc('cancelar_visita',{p_id_visita:next}));
    await ok(staff.api.rpc('valorar_visita',{p_id_visita:first,p_mascotas:pets,p_total_aceptado:q.total}));
    assert.equal((await ok(owner.api.from('visitas').select('estado').eq('id_visita',first).single())).estado,'CONFIRMADA');
  });
  await test('visit payments, refund bounds and staff-only validation',async()=>{
    const id=await ok(Promise.resolve((await reserve(owner.api,[petInput(small.id_mascota)],at(day(11)))).result));
    const args={p_id_visita:id,p_monto:50,p_tipo:'ANTICIPO',p_metodo:'EFECTIVO',p_estado:'VALIDADO'};
    await fails(owner.api.rpc('registrar_pago_visita',args),'42501');await ok(staff.api.rpc('registrar_pago_visita',args));
    const pending=await ok(staff.api.rpc('registrar_pago_visita',{...args,p_monto:100,p_estado:'PENDIENTE'}));
    await fails(staff.api.rpc('validar_pago_visita',{p_id_pago:pending,p_aprobar:true}),'22023');
    await ok(staff.api.rpc('registrar_pago_visita',{...args,p_monto:20,p_tipo:'REEMBOLSO'}));
    await fails(staff.api.rpc('registrar_pago_visita',{...args,p_monto:31,p_tipo:'REEMBOLSO'}),'22023');
  });
  await test('coat assessment is staff-only and preserves the customer acceptance step',async()=>{
    const id=await ok(Promise.resolve((await reserve(owner.api,[petInput(small.id_mascota,'BANO_DESENREDADO')],at(day(18)))).result));
    await fails(staff.api.rpc('cambiar_estado_visita',{p_id_visita:id,p_estado:'CONFIRMADA'}),'22023');
    const args={p_id_visita:id,p_id_mascota:small.id_mascota,p_peso:2,p_longitud_pelo:'LARGO',p_tipo_capa:'SIMPLE',p_estado_pelaje:'NORMAL',p_manejo_dificil:false};
    await fails(owner.api.rpc('actualizar_mascota_valorada',args),'42501');
    await ok(staff.api.rpc('actualizar_mascota_valorada',args));
    assert.equal((await ok(owner.api.from('mascotas').select('valorado_por').eq('id_mascota',small.id_mascota).single())).valorado_por,staff.id);
    const pets=[petInput(small.id_mascota,'BANO_DESENREDADO')];const q=await quote(owner.api,pets);
    await ok(staff.api.rpc('valorar_visita',{p_id_visita:id,p_mascotas:pets,p_total_aceptado:q.total}));
    await ok(staff.api.rpc('cambiar_estado_visita',{p_id_visita:id,p_estado:'EN_PROCESO'}));
    await ok(staff.api.rpc('cambiar_estado_visita',{p_id_visita:id,p_estado:'COMPLETADA'}));
    await ok(owner.api.from('mascotas').update({longitud_pelo:'CORTO'}).eq('id_mascota',small.id_mascota));
    assert.equal((await ok(owner.api.from('mascotas').select('valorado_por').eq('id_mascota',small.id_mascota).single())).valorado_por,null);
  });
  await test('editing a domicile invalidates the old route',async()=>{
    await ok(owner.api.from('direcciones_cliente').update({direccion:'Domicilio sintético cambiado'}).eq('id_direccion',address));
    await fails(owner.api.rpc('cotizar_visita',{p_id_direccion:address,p_mascotas:[petInput(small.id_mascota)]}),'22023');
  });
  console.log(`Completed ${passed} integration groups.`);
} finally {
  // Only synthetic records whose IDs were created by this run are removed.
  for(const tariff of tariffRestores)await root.from('precios_servicio').update({precio:tariff.precio,componente_bano:tariff.componente_bano}).eq('id_precio',tariff.id_precio);
  if(clientIds.length){
    const visits=await ok(root.from('visitas').select('id_visita,id_agenda').in('id_cliente',clientIds));
    const visitIds=visits.map(v=>v.id_visita);agendaIds.push(...visits.map(v=>v.id_agenda));
    const citas=await ok(root.from('citas').select('id_cita').in('id_cliente',clientIds));const citaIds=citas.map(c=>c.id_cita);
    if(visitIds.length){await ok(root.from('pagos').delete().in('id_visita',visitIds));await ok(root.from('eventos_visita').delete().in('id_visita',visitIds));}
    if(citaIds.length){await ok(root.from('pagos').delete().in('id_cita',citaIds));await ok(root.from('detalle_cita').delete().in('id_cita',citaIds));}
    await ok(root.from('citas').delete().in('id_cliente',clientIds));
    if(visitIds.length)await ok(root.from('visitas').delete().in('id_visita',visitIds));
    if(agendaIds.length)await ok(root.from('agenda_estilistas').delete().in('id_agenda',agendaIds));
    await ok(root.from('direcciones_cliente').delete().in('id_cliente',clientIds));
    await ok(root.from('mascotas').delete().in('id_cliente',clientIds));await ok(root.from('clientes').delete().in('id_cliente',clientIds));
  }
  for(const original of savedAssignments){
    await ok(root.from('citas').update({id_usuario:original.id_usuario})
      .eq('id_cita',original.id_cita).eq('id_usuario',staff.id));
  }
  if(oldStylist)await ok(root.from('estilistas').update({id_usuario:oldStylist.id_usuario}).eq('id_estilista',oldStylist.id_estilista));
  if(savedAssignments.length){
    const restored=await ok(root.from('citas').select('id_cita,id_usuario').in('id_cita',savedAssignments.map(c=>c.id_cita)).order('id_cita'));
    assert.deepEqual(restored,[...savedAssignments].sort((a,b)=>a.id_cita-b.id_cita),'Existing appointments must keep their original assigned accounts');
    console.log('Existing appointment assignments preserved.');
  }
  for(const id of accounts)await ok(root.auth.admin.deleteUser(id));
  console.log('Synthetic accounts, reservations and payments removed.');
}
