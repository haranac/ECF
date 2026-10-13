import { useState } from "react";
import {
  ArrowLeft,
  PawPrint,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const emptyPet = {
  name: "",
  species: "Perro",
  breed: "",
  size: "Mediano",
  notes: "",
};

function RegisterClient({ onBack, onSaved }) {
  const [client, setClient] = useState({
    name: "",
    phone: "",
    email: "",
    colony: "",
    source: "WhatsApp",
    notes: "",
  });

  const [pets, setPets] = useState([
    { ...emptyPet },
  ]);

  const [cargando, setCargando] = useState(false);

  const updateClient = (e) => {
    setClient({
      ...client,
      [e.target.name]: e.target.value,
    });
  };

  const updatePet = (index, field, value) => {
    const copy = [...pets];

    copy[index] = {
      ...copy[index],
      [field]: value,
    };

    setPets(copy);
  };

  const addPet = () => {
    setPets([
      ...pets,
      { ...emptyPet },
    ]);
  };

  const removePet = (index) => {
    if (pets.length === 1) return;

    setPets(
      pets.filter((_, petIndex) => petIndex !== index)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      // 1. Insertar el cliente utilizando las columnas exactas del diagrama
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .insert([
          {
            nombre: client.name,
            telefono: client.phone,
            email: client.email,
            colonia: client.colony,
            medio_contacto: client.source,
            notas: client.notes
          }
        ])
        .select()
        .single();

      if (clienteError) throw clienteError;

      // Obtener el ID generado (id_cliente)
      const clienteId = clienteData.id_cliente;

      // 2. Mapear y preparar las mascotas con las columnas exactas
      const mascotasParaInsertar = pets.map(pet => ({
        id_cliente: clienteId,
        nombre: pet.name,
        especie: pet.species,
        raza: pet.breed,
        tamano: pet.size,
        padecimientos: pet.notes
      }));

      // 3. Insertar todas las mascotas vinculadas en Supabase
      const { error: mascotaError } = await supabase
        .from('mascotas')
        .insert(mascotasParaInsertar);

      if (mascotaError) throw mascotaError;

      alert("¡Cliente y mascotas registrados correctamente en Supabase!");
      onSaved();

    } catch (error) {
      console.error("Error al registrar en Supabase:", error.message);
      alert(`Hubo un error al registrar: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={19} />
          Volver
        </button>

        <div className="register-header">
          <div>
            <h1>Registrar nuevo cliente</h1>
            <p>
              Agrega la información del cliente y sus
              mascotas para comenzar a gestionarlo.
            </p>
          </div>

          <PawPrint size={45} />
        </div>

        <form onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="section-title">
              <User />
              <h2>1. Datos del cliente</h2>
            </div>

            <div className="form-grid">
              <div>
                <label>Nombre completo *</label>
                <input
                  name="name"
                  value={client.name}
                  onChange={updateClient}
                  placeholder="Ej. Ana García"
                  required
                />
              </div>

              <div>
                <label>WhatsApp / Teléfono *</label>
                <input
                  name="phone"
                  value={client.phone}
                  onChange={updateClient}
                  placeholder="Ej. 981 123 4567"
                  required
                />
              </div>

              <div>
                <label>Correo electrónico</label>
                <input
                  name="email"
                  type="email"
                  value={client.email}
                  onChange={updateClient}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label>Colonia *</label>
                <input
                  name="colony"
                  value={client.colony}
                  onChange={updateClient}
                  placeholder="Ej. Santa Ana"
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="section-title pet-title">
              <div>
                <PawPrint />
                <h2>2. Mascotas</h2>
              </div>

              <button
                type="button"
                className="small-button"
                onClick={addPet}
              >
                <Plus size={18} />
                Agregar mascota
              </button>
            </div>

            {pets.map((pet, index) => (
              <div className="pet-card" key={index}>
                <div className="pet-card-header">
                  <strong>Mascota {index + 1}</strong>

                  {pets.length > 1 && (
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => removePet(index)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <div>
                    <label>Nombre *</label>
                    <input
                      value={pet.name}
                      onChange={(e) =>
                        updatePet(index, "name", e.target.value)
                      }
                      placeholder="Ej. Max"
                      required
                    />
                  </div>

                  <div>
                    <label>Especie</label>
                    <select
                      value={pet.species}
                      onChange={(e) =>
                        updatePet(index, "species", e.target.value)
                      }
                    >
                      <option value="Perro">Perro</option>
                      <option value="Gato">Gato</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label>Raza</label>
                    <input
                      value={pet.breed}
                      onChange={(e) =>
                        updatePet(index, "breed", e.target.value)
                      }
                      placeholder="Ej. French Poodle"
                    />
                  </div>

                  <div>
                    <label>Tamaño</label>
                    <select
                      value={pet.size}
                      onChange={(e) =>
                        updatePet(index, "size", e.target.value)
                      }
                    >
                      <option value="Chico">Chico</option>
                      <option value="Mediano">Mediano</option>
                      <option value="Grande">Grande</option>
                      <option value="Gigante">Gigante</option>
                    </select>
                  </div>
                </div>

                <label>
                  Padecimientos, agresividad u observaciones
                </label>
                <textarea
                  value={pet.notes}
                  onChange={(e) =>
                    updatePet(index, "notes", e.target.value)
                  }
                  placeholder="Epilepsia, problemas cardíacos, agresividad, nudos severos..."
                />
              </div>
            ))}
          </section>

          <section className="form-section">
            <h2>3. Información adicional</h2>

            <div className="form-grid">
              <div>
                <label>¿Cómo nos conoció?</label>
                <select
                  name="source"
                  value={client.source}
                  onChange={updateClient}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Publicidad">Publicidad</option>
                  <option value="Recomendación">Recomendación</option>
                  <option value="Boca a boca">Boca a boca</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label>Notas del cliente</label>
                <textarea
                  name="notes"
                  value={client.notes}
                  onChange={updateClient}
                  placeholder="Preferencias de horario, indicaciones, etc."
                />
              </div>
            </div>
          </section>

          <button type="submit" className="primary-button save-button" disabled={cargando}>
            <Save size={20} />
            {cargando ? "Guardando..." : "Guardar cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterClient;