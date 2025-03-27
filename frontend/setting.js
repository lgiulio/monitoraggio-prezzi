function initImpostazioni() {
    // Tutto il codice attuale qui dentro!
    // 🔍 Osserva cambiamenti nel <body> per capire quando sparisce lo scroll
    const observer = new MutationObserver(() => {
        const overflow = document.body.style.overflow;
        console.log("👀 Overflow BODY cambiato:", overflow);

        const modalOpen = document.body.classList.contains("modal-open");
        console.log("🧩 Classe 'modal-open' presente:", modalOpen);
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'class']
    });


    // 🔁 Monitor scroll attivo ogni secondo
    setInterval(() => {
        const scrollAttivo = window.innerHeight < document.body.scrollHeight;
        console.log("⏱ Scroll attivo?", scrollAttivo);
    }, 1000);
    // ...eventuali altri observer o codice...

    // 🔧 FIX: Se body è hidden ma non c'è modale → riattiva scroll
    setInterval(() => {
        const modalAperto = document.querySelector('.modal.show');
        const overflow = document.body.style.overflow;

        if (!modalAperto && overflow === 'hidden') {
            console.warn("🚨 Scroll bloccato senza modale! Ripristino overflow:auto");
            document.body.style.overflow = 'auto';
        }
    }, 1000);



    console.log("🚀 setting.js caricato correttamente!");
    caricaCategorieNotifiche(); 

    const API_URL = "http://localhost:5000/api/selettori"; // ✅ Definiamo API_URL prima di usarlo
    const selettoreForm = document.getElementById("selettoreForm");
    const selectNomi = document.getElementById("nomiMonitorati");
    const contatore = document.getElementById("contatoreNomi");
    const listaSelezionati = document.getElementById("listaSelezionati");
    const btnDeseleziona = document.getElementById("deselezionaTutti");
    token = localStorage.getItem("token");
    caricaNomiPersonalizzati();

    const salvaBtn = document.getElementById("salvaNotifica");

    if (salvaBtn) {
        salvaBtn.addEventListener("click", (e) => {
            e.preventDefault(); // evita che il form faccia il refresh della pagina
            inviaNotifica();
        });
    }

    // 👁️ Mostra/Nascondi password app
    document.getElementById("togglePassword").addEventListener("click", () => {
        const passwordInput = document.getElementById("passwordApp");
        const toggleBtn = document.getElementById("togglePassword");

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            toggleBtn.innerText = "🙈";
        } else {
            passwordInput.type = "password";
            toggleBtn.innerText = "👁️";
        }
    });
    document.getElementById("togglePassword").addEventListener("click", () => {
        const passwordInput = document.getElementById("passwordApp");
        const toggleBtn = document.getElementById("togglePassword");

        const icon = toggleBtn.querySelector("i");

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            icon.classList.remove("bi-eye-fill");
            icon.classList.add("bi-eye-slash-fill");
        } else {
            passwordInput.type = "password";
            icon.classList.remove("bi-eye-slash-fill");
            icon.classList.add("bi-eye-fill");
        }
    });


    // ✅ Funzione per aprire il modal per Nuovo/Modifica
    window.openModal = function (id = null, tipo = "nome", selettore = "") {
        document.getElementById("selettoreId").value = id || "";
        document.getElementById("tipoSelettore").value = tipo;
        document.getElementById("selettoreInput").value = selettore;

        const modalLabel = document.getElementById("modalLabel");
        modalLabel.textContent = id ? "Modifica Selettore" : "Nuovo Selettore";

        const modalElement = new bootstrap.Modal(document.getElementById("selettoreModal"));
        modalElement.show();
    };



    // ✅ Carica i selettori e li inserisce nella tabella
    window.loadSelettori = function () {
        console.log("🔍 Tentativo di caricamento selettori...");
        axios.get(API_URL)
            .then(response => {
                console.log("✅ Selettori ricevuti:", response.data);
                const selettoriTableBody = document.getElementById("selettoriTableBody");
                selettoriTableBody.innerHTML = "";

                if (!response.data.length) {
                    selettoriTableBody.innerHTML = "<tr><td colspan='4' class='text-center'>Nessun selettore trovato</td></tr>";
                    return;
                }

                response.data.forEach(selettore => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                    <td>${selettore.id}</td>
                    <td>${selettore.tipo}</td>
                    <td>${selettore.selettore}</td>
                  <td class="text-end">
  <i class="bi bi-pencil text-primary cursor-pointer me-2"
     onclick="openModal(${selettore.id}, '${selettore.tipo}', '${selettore.selettore}')"
     title="Modifica selettore"></i>

  <i class="bi bi-trash text-danger cursor-pointer"
     onclick="deleteSelettore(${selettore.id})"
     title="Elimina selettore"></i>
</td>


                `;
                    selettoriTableBody.appendChild(row);
                });
            })
            .catch(error => console.error("❌ Errore nel caricamento dei selettori:", error));
    };

    // ✅ Sposta la chiamata QUI, dopo che la funzione è stata definita!
    window.loadSelettori();

    // ✅ Aggiunge un nuovo selettore o modifica uno esistente
    selettoreForm.addEventListener("submit", function (event) {
        event.preventDefault(); // Evita il refresh della pagina

        const id = document.getElementById("selettoreId").value;
        const tipo = document.getElementById("tipoSelettore").value;
        const selettore = document.getElementById("selettoreInput").value.trim();

        // ⚠️ Blocco se il selettore è vuoto o troppo corto
        if (!selettore || selettore.length < 2) {
            alert("⚠️ Inserisci un selettore valido (minimo 2 caratteri).");
            return;
        }

        if (id) {
            updateSelettore(id, tipo, selettore);
        } else {
            addSelettore(tipo, selettore);
        }
    });


    // ✅ Funzione per aggiungere un nuovo selettore
    window.addSelettore = function (tipo, selettore) {
        console.log("🟡 Inizio funzione addSelettore");
        console.log("📥 Tipo:", tipo, " | Selettore:", selettore);

        axios.post(API_URL, { tipo, selettore })
            .then(() => {
                console.log("✅ Selettore aggiunto con successo!");

                // Ricarica i selettori
                console.log("🔄 Chiamata a window.loadSelettori()");
                window.loadSelettori();


                // Chiudi modale
                chiudiModaleSelettore();

                setTimeout(() => {
                    document.body.style.overflow = 'auto';
                    document.body.classList.remove("modal-open");
                    document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
                }, 800);


                // Pulisce input
                document.getElementById("selettoreInput").value = "";
                document.getElementById("selettoreId").value = "";
                console.log("🧹 Input pulito");


                // 👀 Forza focus su select per riattivare la UI
                document.getElementById("tipoSelettore").focus();

                // (Opzionale) Scroll su
                window.scrollTo({ top: 0, behavior: 'smooth' });


                // Conferma visuale
                alert("✅ Selettore salvato correttamente!");
            })
            .catch(error => {
                console.error("❌ Errore nell'aggiunta del selettore:", error);
                alert("❌ Errore durante il salvataggio. Riprova.");
            });
    };


    // ✅ Funzione per modificare un selettore
    window.updateSelettore = function (id, tipo, selettore) {
        axios.put(`${API_URL}/${id}`, { tipo, selettore })
            .then(() => {
                console.log("✅ Selettore modificato con successo!");
                window.loadSelettori();

                // Chiudi modale in modo sicuro
                chiudiModaleSelettore(); // ✅ usa la funzione qui
                setTimeout(() => {
                    document.body.style.overflow = 'auto';
                    document.body.classList.remove("modal-open");
                    document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
                }, 800);

                // Pulisce input
                document.getElementById("selettoreInput").value = "";
                document.getElementById("selettoreId").value = "";

                // Conferma visuale
                alert("✅ Selettore aggiornato con successo!");
            })
            .catch(error => {
                console.error("❌ Errore nella modifica del selettore:", error);
                alert("❌ Errore durante la modifica. Riprova.");
            });
    };

    // ✅ Funzione per eliminare un selettore
    window.deleteSelettore = function (id) {
        console.log(`🗑️ Eliminazione del selettore ID ${id}...`);

        axios.delete(`${API_URL}/${id}`)
            .then(() => {
                console.log("✅ Selettore eliminato con successo!");
                window.loadSelettori();
            })
            .catch(error => console.error("❌ Errore nella rimozione del selettore:", error));
    };

    function chiudiModaleSelettore() {
        const modalEl = document.getElementById("selettoreModal");
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) {
            modalInstance.hide();
        }

        // 🧹 Fix completo per scroll e backdrop
        setTimeout(() => {
            document.body.classList.remove("modal-open");
            document.body.style.overflow = 'auto';
            document.body.style.paddingRight = '';

            // Rimuove TUTTI i backdrop residui
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(el => el.remove());

            // 🔁 Forza un repaint (utile per Safari o Firefox)
            document.body.offsetHeight; // forzatura layout
        }, 500); // aumenta da 300 a 500ms per garantire che l’animazione sia finita
    }


    async function caricaNomiPersonalizzati() {

        if (!token) return;

        try {
            const categoriaId = document.getElementById("categoriaFiltroNotifiche")?.value;
            if (!categoriaId) {
                console.warn("⚠️ Nessuna categoria selezionata per caricare i nomi personalizzati.");
                return;
            }

            const response = await axios.get(`http://localhost:5000/api/nomi-personalizzati?categoria_id=${categoriaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const select = document.getElementById("nomiMonitorati");
            const notificheContainer = document.getElementById("notificheNomiContainer");

            // ✅ Continua solo se almeno uno dei due esiste
            if (!select && !notificheContainer) return;

            if (select) select.innerHTML = '';
            if (notificheContainer) notificheContainer.innerHTML = '';

            response.data.forEach(nome => {
                if (select) {
                    const option = document.createElement("option");
                    option.value = nome;
                    option.textContent = nome;
                    select.appendChild(option);
                }

                if (notificheContainer) {
                    const wrapper = document.createElement("div");
                    wrapper.classList.add("form-check");

                    const checkbox = document.createElement("input");
                    checkbox.classList.add("form-check-input");
                    checkbox.type = "checkbox";
                    checkbox.name = "notificheNomi[]";
                    checkbox.value = nome;
                    checkbox.id = `notifica-${nome.replace(/\s+/g, '-')}`;

                    const label = document.createElement("label");
                    label.classList.add("form-check-label");
                    label.setAttribute("for", checkbox.id);
                    label.textContent = nome;

                    wrapper.appendChild(checkbox);
                    wrapper.appendChild(label);
                    notificheContainer.appendChild(wrapper);
                }
            });

        } catch (error) {
            console.error("❌ Errore nel caricamento dei nomi personalizzati:", error);
        }
    }

    const selectCategoria = document.getElementById("categoriaFiltroNotifiche");

    if (selectCategoria) {
        selectCategoria.addEventListener("change", async (e) => {
            const categoriaId = e.target.value;
            console.log("📂 Categoria selezionata:", categoriaId);

            if (categoriaId) {
                await caricaNomiPersonalizzati();
                await caricaNotificaSalvata(categoriaId);
            }
        });

        // ⚡ Caricamento iniziale, in un async IIFE
        (async () => {
            if (selectCategoria.value) {
                console.log("⚡ Caricamento iniziale per categoria:", selectCategoria.value);
                await caricaNomiPerCategoria(selectCategoria.value);
                await caricaNotificaSalvata(selectCategoria.value);
            }
        })();
    }

    async function caricaNotificaSalvata(categoriaId) {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await axios.get(`http://localhost:5000/api/notifiche/${categoriaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const {
                nomi,
                orario,
                frequenza,
                email_notifica,
                email_mittente,
                password_app
            } = res.data;

            console.log("📥 Notifica trovata:", res.data);

            // ✅ Pre-seleziona i nomi nella lista
            const selectNomi = document.getElementById("nomiMonitorati");
            let count = 0;

            Array.from(selectNomi.options).forEach(option => {
                const isSelected = nomi.includes(option.value);
                option.selected = isSelected;
                if (isSelected) count++;
            });

            // ✅ Imposta orario e frequenza
            document.getElementById("orarioNotifica").value = orario || "";
            document.getElementById("metodoNotifica").value = frequenza || "";

            // ✅ Imposta email e password mittente
            document.getElementById("emailNotifica").value = email_notifica || "";
            document.getElementById("emailMittente").value = email_mittente || "";
            document.getElementById("passwordApp").value = password_app || "";

            // ✅ Aggiorna contatore se esiste
            if (typeof aggiornaConteggioSelezionati === "function") {
                aggiornaSelezioni();

            }

        } catch (error) {
            console.warn("ℹ️ Nessuna notifica salvata per questa categoria:", error.response?.data?.message || error.message);

            // 🔁 Reset dei campi se non ci sono dati
            document.getElementById("orarioNotifica").value = "";
            document.getElementById("metodoNotifica").value = "";
            document.getElementById("emailNotifica").value = "";
            document.getElementById("emailMittente").value = "";
            document.getElementById("passwordApp").value = "";

            Array.from(document.getElementById("nomiMonitorati").options).forEach(opt => opt.selected = false);

            if (typeof aggiornaConteggioSelezionati === "function") {
                aggiornaConteggioSelezionati();
            }
        }
    }



    // 👉 Funzione per aggiornare contatore + lista
    function aggiornaSelezioni() {
        const selected = Array.from(selectNomi.selectedOptions).map(opt => opt.value);
        contatore.textContent = `${selected.length} nome${selected.length !== 1 ? 'i' : ''} selezionato${selected.length !== 1 ? 'i' : ''}`;

        // Mostra i nomi selezionati in elenco
        if (selected.length > 0) {
            listaSelezionati.textContent = `📦 Selezionati: ${selected.join(', ')}`;
        } else {
            listaSelezionati.textContent = '';
        }
    }

    // 🟢 Listener per cambi selezione
    selectNomi.addEventListener("change", aggiornaSelezioni);

    // ❌ Deseleziona tutti
    btnDeseleziona.addEventListener("click", () => {
        Array.from(selectNomi.options).forEach(opt => opt.selected = false);
        aggiornaSelezioni();
    });

    //document.getElementById("salvaNotifica").addEventListener("click", async (e) => {
    //    e.preventDefault();

    //    const orario = document.getElementById("orarioNotifica").value;
    //    const frequenza = document.getElementById("metodoNotifica").value;
    //    const nomi = Array.from(document.getElementById("nomiMonitorati").selectedOptions).map(opt => opt.value);
    //    const token = localStorage.getItem("token");

    //    if (!token) {
    //        alert("❌ Devi essere autenticato.");
    //        return;
    //    }

    //    if (!orario || !frequenza || nomi.length === 0) {
    //        alert("⚠️ Compila tutti i campi prima di salvare.");
    //        return;
    //    }

    //    try {
    //        const response = await axios.post("http://localhost:5000/api/notifiche", {
    //            orario,
    //            frequenza,
    //            nomi
    //        }, {
    //            headers: { Authorization: `Bearer ${token}` }
    //        });

    //        alert("✅ Impostazioni salvate!");
    //        console.log("📦 Risposta backend:", response.data);
    //    } catch (error) {
    //        console.error("❌ Errore durante il salvataggio:", error);
    //        alert("Errore nel salvataggio delle impostazioni.");
    //    }
    //});


    async function inviaNotifica() {
        console.log("🚀 inviaNotifica chiamata!");

        const emailNotifica = document.getElementById("emailNotifica").value;
        const metodoNotifica = document.getElementById("metodoNotifica").value;
        let orarioNotifica = document.getElementById("orarioNotifica").value;
        const nomiSelezionati = Array.from(document.getElementById("nomiMonitorati").selectedOptions).map(opt => opt.value);

        // ✅ Recupera la categoria selezionata
        const categoriaSelect = document.getElementById("categoriaFiltroNotifiche");
        const categoriaId = categoriaSelect ? categoriaSelect.value : null;

        // 🔐 Recupera token
        const token = localStorage.getItem("token");

        // ✅ Validazioni
        if (!token) {
            alert("❌ Devi essere autenticato.");
            return;
        }

        if (!orarioNotifica) {
            orarioNotifica = "09:00";
            console.warn("⚠️ Nessun orario selezionato, imposto orario predefinito:", orarioNotifica);
        }

        if (!emailNotifica || !metodoNotifica || nomiSelezionati.length === 0 || !categoriaId) {
            alert("⚠️ Compila tutti i campi (inclusa categoria) prima di salvare.");
            return;
        }

        // 🧪 Debug in console
        console.log("📤 Inviando dati:", {
            emailNotifica,
            metodoNotifica,
            orarioNotifica,
            nomiSelezionati,
            categoriaId
        });

        try {
            const emailMittente = document.getElementById("emailMittente").value;
            const passwordApp = document.getElementById("passwordApp").value;

            const payload = {
                orario: orarioNotifica,
                frequenza: metodoNotifica,
                nomi: nomiSelezionati,
                emailNotifica,
                emailMittente,
                passwordApp,
                categoria_id: categoriaId
            };

            console.log("📤 Payload da inviare:", payload);

            const response = await axios.post("http://localhost:5000/api/notifiche", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("✅ Impostazioni salvate con successo!");
            console.log("📬 Risposta dal server:", response.data);
        } catch (error) {
            console.error("❌ Errore durante il salvataggio:", error);
            alert("Errore durante il salvataggio delle notifiche.");
        }
    }


    async function salvaSMTP() {
        const emailMittente = document.getElementById("emailMittente").value;
        const passwordApp = document.getElementById("passwordApp").value;
        const token = localStorage.getItem("token");

        if (!emailMittente || !passwordApp) {
            alert("⚠️ Inserisci email e password app per il mittente.");
            return;
        }

        try {
            const response = await axios.post("http://localhost:5000/api/smtp-config", {
                emailMittente,
                passwordApp
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("✅ SMTP salvato:", response.data);
        } catch (error) {
            console.error("❌ Errore salvataggio SMTP:", error);
            alert("Errore nel salvataggio dei dati SMTP.");
        }
    }

    document.getElementById("notificheForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        await salvaSMTP();       // 🔐 Salva prima il mittente
        await inviaNotifica();   // 📬 Poi salva la notifica vera e propria

    });

    // Rende disponibile la funzione globalmente
    window.initImpostazioni = initImpostazioni;



    async function caricaCategorieNotifiche() {
        const token = localStorage.getItem("token");
        const select = document.getElementById("categoriaFiltroNotifiche");
        if (!select) {
            console.warn("⚠️ categoriaFiltroNotifiche non trovato nel DOM.");
            return;
        }

        try {
            const res = await axios.get("http://localhost:5000/api/categorie", {
                headers: { Authorization: `Bearer ${token}` }
            });

            select.innerHTML = `<option value="">-- Seleziona Categoria --</option>`;

            res.data.forEach(cat => {
                const option = document.createElement("option");
                option.value = cat.id;
                option.textContent = cat.nome;
                select.appendChild(option);
            });

            console.log("📂 Categorie caricate nel filtro notifiche");

        } catch (err) {
            console.error("❌ Errore nel caricamento delle categorie:", err);
        }
    }

    document.getElementById("categoriaFiltroNotifiche").addEventListener("change", async function () {
        const categoriaId = this.value;
        const selectNomi = document.getElementById("nomiMonitorati");

        if (!categoriaId) {
            selectNomi.innerHTML = "";
            return;
        }

        try {
            const token = localStorage.getItem("token");

            const res = await axios.get(`http://localhost:5000/api/nomi-personalizzati?categoria_id=${categoriaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            selectNomi.innerHTML = "";

            res.data.forEach(nome => {
                const option = document.createElement("option");
                option.value = nome;
                option.textContent = nome;
                selectNomi.appendChild(option);
            });

            console.log(`📄 ${res.data.length} nomi personalizzati caricati per categoria ${categoriaId}`);

        } catch (err) {
            console.error("❌ Errore caricando nomi personalizzati per categoria:", err);
        }
    });

    // 🔕 Disattiva notifica (aggiorna lo stato, ma non elimina)
    document.getElementById("disattivaNotificaBtn").addEventListener("click", async () => {
        const token = localStorage.getItem("token");
        const categoriaId = document.getElementById("categoriaFiltroNotifiche")?.value;

        if (!token || !categoriaId) {
            alert("⚠️ Seleziona una categoria prima di disattivare.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:5000/api/notifiche/disattiva", {
                categoria_id: categoriaId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("🔕 Notifica disattivata con successo.");
            console.log("📬 Risposta:", res.data);

            // Reset dei campi
            document.getElementById("orarioNotifica").value = "";
            document.getElementById("metodoNotifica").value = "";
            Array.from(document.getElementById("nomiMonitorati").options).forEach(opt => opt.selected = false);

        } catch (err) {
            console.error("❌ Errore disattivazione:", err);
            alert("Errore durante la disattivazione.");
        }
    });


    // 🗑️ Elimina notifica completamente
    document.getElementById("eliminaNotificaBtn").addEventListener("click", async () => {
        const categoriaId = document.getElementById("categoriaFiltroNotifiche").value;
        const token = localStorage.getItem("token");
        if (!categoriaId || !token) return alert("⚠️ Seleziona una categoria");

        const conferma = confirm("Sei sicuro di voler eliminare questa notifica?");
        if (!conferma) return;

        try {
            await axios.delete(`http://localhost:5000/api/notifiche/${categoriaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("🗑️ Notifica eliminata");

            // Pulisci il form dopo eliminazione
            document.getElementById("orarioNotifica").value = "";
            document.getElementById("metodoNotifica").value = "";
            Array.from(document.getElementById("nomiMonitorati").options).forEach(opt => opt.selected = false);

        } catch (err) {
            console.error("❌ Errore eliminazione:", err);
            alert("Errore durante l'eliminazione della notifica.");
        }
    });





}