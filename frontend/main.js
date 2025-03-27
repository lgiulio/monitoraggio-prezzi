const API_URL = "https://monitoraggio-prezzi.onrender.com/api/prodotti";
const LOGIN_URL = "https://monitoraggio-prezzi.onrender.com/api/login";
const REGISTER_URL = "https://monitoraggio-prezzi.onrender.com/api/register";
const LOGOUT_URL = "https://monitoraggio-prezzi.onrender.com/api/logout";


async function caricaNomiPersonalizzati() {
    console.log("🔁 Tentativo di caricamento nomi personalizzati...");

    const token = localStorage.getItem("token");
    if (!token) {
        console.warn("⚠️ Nessun token trovato.");
        return;
    }

    try {
        const categoriaId = document.getElementById("categoriaProdotto")?.value;

        if (!categoriaId) {
            console.warn("⚠️ Nessuna categoria selezionata per caricare i nomi personalizzati.");
            return;
        }

        // ✅ Manca questa riga nel tuo codice
        const response = await axios.get(`https://monitoraggio-prezzi.onrender.com/api/nomi-personalizzati?categoria_id=${categoriaId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const select = document.getElementById("filtroNomiPersonalizzati");
        const notificheContainer = document.getElementById("notificheNomiContainer");
        const monitoraggioSelect = document.getElementById("nomiMonitorati");

        console.log("📡 Nomi ricevuti dal server:", response.data);
        console.log("🎯 select:", select);
        console.log("🎯 notificheContainer:", notificheContainer);
        console.log("🎯 Select Monitoraggio:", monitoraggioSelect);

        if (!select && !notificheContainer && !monitoraggioSelect) {
            console.warn("⚠️ Nessun contenitore trovato per caricare i nomi.");
            return;
        }

        // Pulizia
        if (select) select.innerHTML = "";
        if (notificheContainer) notificheContainer.innerHTML = "";
        if (monitoraggioSelect) monitoraggioSelect.innerHTML = "";

        response.data.forEach(nome => {
            console.log("➕ Aggiungo nome:", nome);

            // Select principale
            if (select) {
                const option = document.createElement("option");
                option.value = nome;
                option.textContent = nome;
                select.appendChild(option);
            }

            // Checkbox notifiche
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

            // Select delle notifiche (nomiMonitorati)
            if (monitoraggioSelect) {
                const opt = document.createElement("option");
                opt.value = nome;
                opt.textContent = nome;
                monitoraggioSelect.appendChild(opt);
            }
        });

    } catch (error) {
        console.error("❌ ERRORE nella richiesta o elaborazione:", error);
    }
}


document.addEventListener("DOMContentLoaded", function () {
    const authSection = document.getElementById("authSection");
    const mainContent = document.getElementById("mainContent");
    const logoutBtn = document.getElementById("logoutBtn");
    const filtroNomi = document.getElementById("filtroNomiPersonalizzati");
    const verificaSelezionatiBtn = document.getElementById("verificaSelezionatiBtn");


    const deselezionaTuttiBtn = document.getElementById("deselezionaTuttiBtn");

   

     const verificaBtn = document.getElementById("verificaPrezziBtn");

    setupVerificaPrezzi();

 

    document.addEventListener("change", function (e) {
        if (e.target.classList.contains("selezioneProdotto")) {
            aggiornaConteggioSelezionati();
        }
    });
    


    if (deselezionaTuttiBtn) {
        deselezionaTuttiBtn.addEventListener("click", function () {
            document.querySelectorAll(".selezioneProdotto").forEach(cb => cb.checked = false);
            console.log("🔄 Tutte le checkbox sono state deselezionate.");
           //aggiornaConteggioSelezionati();
        });
    }
   

    const token = localStorage.getItem("token");
    console.log("🧪 Token trovato:", token);

    if (token) {
        showMainContent();
        caricaNomiPersonalizzati();
        console.log("🧩 Esiste filtroNomiPersonalizzati?", document.getElementById("filtroNomiPersonalizzati"));

    }

    //Gestione modifica elimina categoria

    const formCategoria = document.getElementById("formCategoria");

    if (formCategoria) {
        console.log("📄 formCategoria trovato, aggiungo event listener");

        formCategoria.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("categoriaId").value;
            const nome = document.getElementById("nomeCategoria").value;
            const token = localStorage.getItem("token");

            try {
                if (id) {
                    // Modifica
                    await axios.put(`https://monitoraggio-prezzi.onrender.com/api/categorie/${id}`, { nome }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } else {
                    // Aggiunta
                    await axios.post("https://monitoraggio-prezzi.onrender.com/api/categorie", { nome }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }

                await caricaCategorieNelSelect();   // aggiorna il select nel form
                await caricaCategorieLista();       // aggiorna lista nel modale
                document.getElementById("formCategoria").reset();

            } catch (err) {
                console.error("❌ Errore categoria:", err);
                alert("Errore salvataggio categoria");
            }
        });
    } else {
        console.warn("⚠️ formCategoria non trovato nel DOM.");
    }

       console.log("📡 Bootstrap caricato:", typeof bootstrap !== "undefined");

    const searchFiltro = document.getElementById("searchFiltro");

    if (searchFiltro && filtroNomi) {
        searchFiltro.addEventListener("input", function () {
            const searchTerm = this.value.toLowerCase();

            Array.from(filtroNomi.options).forEach(option => {
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? "block" : "none";
            });
        });
    }



    // 🔹 Event delegation per modifica ed elimina
    document.addEventListener("click", function (event) {
        if (event.target.classList.contains("btn-modifica")) {
            event.stopImmediatePropagation();
            modificaProdotto(event);
        }

        if (event.target.classList.contains("btn-elimina")) {
            event.stopImmediatePropagation();
            eliminaProdotto(event);
        }
    });

    // 🔹 Custom multiselect logica per il filtro
    if (filtroNomi) {
        // Imposta comportamento custom per mantenere le selezioni
        Array.from(filtroNomi.options).forEach(option => {
            option.addEventListener("mousedown", function (e) {
                e.preventDefault();
                option.selected = !option.selected;
                filtroNomi.dispatchEvent(new Event("change"));
                aggiornaConteggioSelezionati();
            });
        });

        // 🔹 Quando cambia la selezione
        // 🔄 Cattura clic manuale su opzioni select per toggle
        // ✅ Gestione selezione/deselezione singolo nome personalizzato
        // ✅ Selezione/Deselezione nomi personalizzati nel select
        filtroNomi.addEventListener("mousedown", function (e) {
            e.preventDefault(); // Impedisce il comportamento di default

            const option = e.target;
            option.selected = !option.selected; // Toggle manuale della selezione

            const nomeClicked = option.value.trim().toLowerCase();
            const isNowSelected = option.selected;

            console.log(`🖱️ Hai cliccato su: ${nomeClicked} (${isNowSelected ? "SELEZIONATO" : "DESELEZIONATO"})`);

            document.querySelectorAll("#prodotti-table-body tr").forEach(row => {
                const nomePersonalizzato = row.children[2]?.textContent?.trim().toLowerCase();
                const checkbox = row.querySelector(".selezioneProdotto");

                if (nomePersonalizzato === nomeClicked && checkbox) {
                    checkbox.checked = isNowSelected;
                }
            });
            aggiornaConteggioSelezionati();
            return false;
          
        });


    } else {
        console.warn("⚠️ ID 'filtroNomiPersonalizzati' non trovato nel DOM.");
    }

    // 🔹 Bottone "Verifica Selezionati"
    if (verificaSelezionatiBtn) {
        verificaSelezionatiBtn.addEventListener("click", async function () {
            const selectedNomi = Array.from(filtroNomi.selectedOptions).map(opt => opt.value.trim());

            if (selectedNomi.length === 0) {
                alert("⚠️ Seleziona almeno un nome personalizzato.");
                return;
            }

            console.log("🟢 Nomi selezionati per verifica:", selectedNomi);

            // TODO: Qui invia selectedNomi al backend se vuoi fare verifiche automatiche
            // Esempio:
            // const res = await axios.post('/api/verifica-nomi', { nomi: selectedNomi });

           
        });
    }
  



    // 📌 LOGIN
    document.getElementById("loginForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const response = await axios.post(LOGIN_URL, { email, password });

            if (response.data.token) {
                localStorage.setItem("token", response.data.token);
                alert("Login effettuato con successo!");
                window.location.reload();
            }
        } catch (error) {
            console.error("❌ Errore nel login:", error);
            alert("❌ Errore nel login. Controlla le credenziali.");
        }
    });

    // 📌 REGISTRAZIONE
    document.getElementById("registerForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        const nome = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value.trim();

        console.log("🟢 DEBUG - Dati raccolti:");
        console.log("🔹 Nome:", nome);
        console.log("🔹 Email:", email);
        console.log("🔹 Password: (non stampata per sicurezza)");

        if (!nome || !email || !password) {
            alert("⚠️ Tutti i campi sono obbligatori!");
            return;
        }

        try {
            console.log("📡 DEBUG - Inviando dati al server...");
            const response = await axios.post("https://monitoraggio-prezzi.onrender.com/api/register", { nome, email, password });

            console.log("✅ DEBUG - Risposta ricevuta:", response.data);
            alert("🎉 Registrazione completata! Ora puoi accedere.");
            document.getElementById("registerForm").reset();
        } catch (error) {
            console.error("❌ ERRORE nella registrazione:", error.response ? error.response.data : error);
            alert("❌ Errore nella registrazione.");
        }
    });

    
   


    // 📌 LOGOUT
    logoutBtn.addEventListener("click", async function () {
        try {
            await axios.post(LOGOUT_URL, {}, { headers: { Authorization: `Bearer ${token}` } });
            localStorage.removeItem("token");
            alert("Logout effettuato!");
            window.location.reload();
        } catch (error) {
            alert("❌ Errore nel logout.");
        }
    });

    // 📌 Funzione per mostrare il contenuto principale dopo il login
    function showMainContent() {
        authSection.classList.add("d-none");
        mainContent.classList.remove("d-none");
        logoutBtn.classList.remove("d-none");
        caricaCategorieNelSelect(); // ✅ carica le categorie nella dropdown

        loadProducts();
    }
    async function loadProducts(categoriaId = null) {
        const token = localStorage.getItem("token");
        if (!token) {
            console.warn("❌ Token non trovato, impossibile caricare i prodotti.");
            return;
        }

        const tableBody = document.getElementById("prodotti-table-body");

        // ✅ Se nessuna categoria è selezionata, svuoto la tabella e interrompo
        if (!categoriaId || categoriaId === "") {
            console.log("⚠️ Nessuna categoria selezionata. Tabella svuotata.");
            tableBody.innerHTML = "";
            return;
        }

        try {
            const url = `https://monitoraggio-prezzi.onrender.com/api/prodotti?categoria=${categoriaId}`;

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const prodotti = response.data;
            console.log("📦 Prodotti caricati:", prodotti);

            tableBody.innerHTML = "";

            prodotti.forEach(prodotto => {
                const row = `
                <tr data-id="${prodotto.id}" data-categoria-id="${prodotto.categoria_id || ''}">
                    <td><input type="checkbox" class="selezioneProdotto" data-id="${prodotto.id}" data-url="${prodotto.url || ''}" data-selettore="${prodotto.selettore || ''}"></td>
                  <td class="text-truncate" style="max-width: 200px;" title="${prodotto.nome}">
  ${prodotto.nome.length > 40 ? prodotto.nome.substring(0, 37) + "..." : prodotto.nome}
</td>

                    <td>${prodotto.nome_personalizzato ? prodotto.nome_personalizzato : "-"}</td>
                    <td><a href="${prodotto.url}" target="_blank">Vai al sito</a></td>
                    <td>${prodotto.prezzo || "N/A"} €</td>
                    <td>${prodotto.ultima_verifica || "Mai"}</td>
                    <td class="text-end">
                        <i class="bi bi-pencil text-primary me-3 cursor-pointer btn-modifica"
                           data-id="${prodotto.id}" 
                           title="Modifica selettore"></i>

                        <i class="bi bi-trash text-danger cursor-pointer btn-elimina" 
                           data-id="${prodotto.id}" 
                           title="Elimina selettore"></i>
                    </td>
                </tr>
            `;

                tableBody.innerHTML += row;
            });

            setupFiltroNomiPersonalizzati();
            aggiornaConteggioSelezionati();

        } catch (error) {
            console.error("❌ Errore nel caricamento prodotti:", error);
            alert("Errore nel caricamento dei prodotti!");
        }
    }


    
  //Gestione aggiungi, elimina e modifica categorie
    function apriModalCategoria() {
        document.getElementById("categoriaId").value = "";
        document.getElementById("nomeCategoria").value = "";

        caricaCategorieLista(); // ✅ mostra subito la lista

        const modal = new bootstrap.Modal(document.getElementById("modalCategoria"));
        modal.show();
    }
    window.apriModalCategoria = apriModalCategoria;



    async function caricaCategorieLista() {
        const token = localStorage.getItem("token");
        const container = document.getElementById("listaCategorie");
        container.innerHTML = "";

        try {
            const res = await axios.get("https://monitoraggio-prezzi.onrender.com/api/categorie", {
                headers: { Authorization: `Bearer ${token}` }
            });

            res.data.forEach(cat => {
                const div = document.createElement("div");
                div.className = "d-flex justify-content-between align-items-center border-bottom py-1";

                // 🔧 QUI devi usare il codice che ti ho detto:
                div.innerHTML = `
              <span>${cat.nome}</span>
              <div>
                <i class="bi bi-pencil-square text-primary me-3" style="cursor:pointer;" title="Modifica" onclick="modificaCategoria(${cat.id}, '${cat.nome.replace(/'/g, "\\'")}')"></i>
                <i class="bi bi-trash3 text-danger" style="cursor:pointer;" title="Elimina" onclick="eliminaCategoria(${cat.id})"></i>
              </div>
            `;

                container.appendChild(div);
            });

        } catch (err) {
            console.error("❌ Errore caricamento categorie:", err);
        }
    }
    window.caricaCategorieLista = caricaCategorieLista;

    function modificaCategoria(id, nome) {
        document.getElementById("categoriaId").value = id;
        document.getElementById("nomeCategoria").value = nome;

        const modal = new bootstrap.Modal(document.getElementById("modalCategoria"));
        modal.show();
    }
    window.modificaCategoria = modificaCategoria;

    async function eliminaCategoria(id) {
        const conferma = confirm("Sei sicuro di voler eliminare questa categoria?");
        if (!conferma) return;

        const token = localStorage.getItem("token");

        try {
            await axios.delete(`https://monitoraggio-prezzi.onrender.com/api/categorie/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await caricaCategorieNelSelect();
            await caricaCategorieLista();

        } catch (err) {
            console.error("❌ Errore eliminazione categoria:", err);

            const messaggio = err?.response?.data?.errore || "Errore durante l'eliminazione";
            alert(messaggio);
        }
    }

    window.eliminaCategoria = eliminaCategoria;

    //Caricare il select categoria del modale prodotto
    async function popolaCategorieNelModale(categoriaIdDaSelezionare) {
        const token = localStorage.getItem("token");
        const select = document.getElementById("modale_categoria");

        if (!select) {
            console.warn("⚠️ Select #modale_categoria non trovata.");
            return;
        }

        try {
            const res = await axios.get("https://monitoraggio-prezzi.onrender.com/api/categorie", {
                headers: { Authorization: `Bearer ${token}` }
            });

            select.innerHTML = `<option value="">-- Seleziona Categoria --</option>`;

            console.log("🎯 categoriaIdDaSelezionare:", categoriaIdDaSelezionare, typeof categoriaIdDaSelezionare);
            res.data.forEach(cat => {
                const option = document.createElement("option");
                option.value = String(cat.id); // 👈 forza a stringa
                option.textContent = cat.nome;
                select.appendChild(option);
            });

            console.log("🎯 categoriaIdDaSelezionare:", categoriaIdDaSelezionare, typeof categoriaIdDaSelezionare);
            console.log("💬 Opzioni caricate:", Array.from(select.options).map(o => o.value));

            select.value = String(categoriaIdDaSelezionare);
            console.log("✅ Dopo assegnazione, select.value =", select.value);

            if (categoriaIdDaSelezionare) {
                setTimeout(() => {
                    select.value = String(categoriaIdDaSelezionare);
                    console.log("✅ Categoria selezionata nel select:", select.value);
                }, 0);
            }

            console.log(`📌 Categorie caricate nel modale. Preselezionata: ${categoriaIdDaSelezionare}`);
        } catch (err) {
            console.error("❌ Errore nel caricamento categorie nel modale:", err);
        }
    }


    function setupFiltroNomiPersonalizzati() {
        const select = document.getElementById("filtroNomiPersonalizzati");

        if (!select) {
            console.warn("⚠️ Dropdown filtro non trovata!");
            return;
        }

        // Custom multiselect behavior
        Array.from(select.options).forEach(option => {
            option.addEventListener("mousedown", (e) => {
                e.preventDefault();
                option.selected = !option.selected;
                option.dispatchEvent(new Event("change"));
            });
        });

        // Listener per attivare checkbox
        select.addEventListener("change", () => {
            const selectedNomi = Array.from(select.selectedOptions).map(opt => opt.value.trim().toLowerCase());

            console.log("🔎 Nomi selezionati:", selectedNomi);

            document.querySelectorAll("#prodotti-table-body tr").forEach(riga => {
                const nomePersonalizzato = riga.children[2].textContent.trim().toLowerCase(); // terza colonna
                const checkbox = riga.querySelector(".selezioneProdotto");

                // ✅ Aggiunge, ma non toglie
                if (selectedNomi.includes(nomePersonalizzato)) {
                    checkbox.checked = true;
                }
            });
        });
    }

    function aggiornaConteggioSelezionati() {
        console.log("🧮 Chiamata aggiornaConteggioSelezionati()");

        const selezionati = document.querySelectorAll(".selezioneProdotto:checked").length;
        console.log("🔢 Checkbox selezionati:", selezionati);

        const label = document.getElementById("conteggioSelezionati");

        if (label) {
            label.textContent = `Prodotti selezionati: ${selezionati}`;
            console.log("✅ Label aggiornata con:", selezionati);
        } else {
            console.warn("⚠️ Label conteggioSelezionati NON trovata!");
        }
    }


    async function modificaProdotto(event) {

        const id = event.target.dataset.id; // Prende l'ID dal pulsante cliccato

        // ✅ Trova la riga corrispondente nella tabella
        const rigaProdotto = event.target.closest("tr");
        if (!rigaProdotto) {
            console.error("❌ Errore: Riga non trovata.");
            return;
        }

        // ✅ Estrai i dati dalla riga della tabella
        const nome = rigaProdotto.children[1].textContent.trim();
        const nomePersonalizzato = rigaProdotto.children[2].textContent.trim();
        const url = rigaProdotto.children[3].querySelector("a").href.trim();
        const prezzo = rigaProdotto.children[4].textContent.trim().replace("€", "").trim();
        const categoriaId = rigaProdotto.dataset.categoriaId; // Lo recuperiamo da data-*
        console.log("📌 categoriaId dalla riga prodotto:", categoriaId); // 👈 QUI!

        // ✅ Mostra i dati nel modale
        document.getElementById("modale_nome").value = nome;
        document.getElementById("modale_nome_personalizzato").value = nomePersonalizzato;
        document.getElementById("modale_url").value = url;
        document.getElementById("modale_prezzo").value = prezzo;

        await popolaCategorieNelModale(categoriaId);


        // ✅ Salva l'ID del prodotto nel bottone di salvataggio
        document.getElementById("salvaModifica").dataset.id = id;

        // ✅ Apri il modale di Bootstrap
        const modal = new bootstrap.Modal(document.getElementById("editModal"));
        modal.show();
    }

    // ✅ Funzione per SALVARE la modifica
    document.getElementById("salvaModifica").addEventListener("click", async function () {
        const id = this.dataset.id; // Recupera l'ID salvato nel pulsante
        const token = localStorage.getItem("token");

        // ✅ Verifica che l'ID sia corretto
        console.log(`🔎 DEBUG - ID Prodotto da modificare: ${id}`);

        const datiAggiornati = {
            nome: document.getElementById("modale_nome").value.trim(),
            nome_personalizzato: document.getElementById("modale_nome_personalizzato").value.trim(),
            url: document.getElementById("modale_url").value.trim(),
            prezzo: document.getElementById("modale_prezzo").value.trim(),
            categoria_id: document.getElementById("modale_categoria").value
        };

        console.log("📡 DEBUG - Dati inviati per la modifica:", datiAggiornati);

        try {
            const response = await axios.put(`https://monitoraggio-prezzi.onrender.com/api/prodotti/${id}`, datiAggiornati, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("✅ DEBUG - Risposta del server:", response.data);

            if (response.data.success) {
                alert("✅ Modifica salvata con successo!");


                const categoriaId = document.getElementById("categoriaProdotto")?.value;
                await loadProducts(categoriaId); // 🔄 Ricarica solo i prodotti della categoria attuale

                const modal = bootstrap.Modal.getInstance(document.getElementById("editModal"));
                modal.hide();
            }
        } catch (error) {
            console.error("❌ Errore nella modifica:", error);
            alert("❌ Errore nella modifica del prodotto.");
        }
    });









    // 📌 Funzione per eliminare un prodotto
    async function eliminaProdotto(event) {
        const id = event.target.getAttribute("data-id"); // Prende l'ID dal bottone

        if (!id) {
            console.error("❌ Errore: ID non trovato.");
            return;
        }

        try {
            const token = localStorage.getItem("token"); // Recupera il token

            const response = await axios.delete(`https://monitoraggio-prezzi.onrender.com/api/prodotti/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("✅ Prodotto eliminato con successo:", response.data);
            alert("✅ Prodotto eliminato!");
            // ✅ Ricarica solo i prodotti della categoria attualmente selezionata
            const categoriaId = document.getElementById("categoriaProdotto")?.value;
            await loadProducts(categoriaId);

        } catch (error) {
            console.error("❌ Errore nella cancellazione:", error);
            alert("❌ Errore nell'eliminazione del prodotto.");
        }
    }
  


    document.getElementById("addProductForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        const token = localStorage.getItem("token");
        if (!token) {
            alert("⚠️ Devi essere autenticato per aggiungere un prodotto!");
            return;
        }

        // ✅ Recupero valori
        const nome = document.getElementById("nome").value.trim();
        const nome_personalizzato = document.getElementById("nome_personalizzato").value.trim() || null;
        const url = document.getElementById("url").value.trim();
        const prezzo = document.getElementById("prezzo").value.trim();
        const categoria_id = document.getElementById("categoriaProdotto").value;

        // ✅ Controlli
        if (!nome || !url || !prezzo || !categoria_id) {
            alert("⚠️ Compila tutti i campi obbligatori, inclusa la categoria.");
            return;
        }

        try {
            const response = await axios.post("https://monitoraggio-prezzi.onrender.com/api/prodotti", {
                nome,
                nome_personalizzato,
                url,
                prezzo,
                categoria_id
            }, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            console.log("✅ Prodotto aggiunto con successo:", response.data);
            alert("✅ Prodotto aggiunto con successo!");

            // ✅ Ricarica i prodotti della categoria selezionata
            loadProducts(categoria_id);

            // ✅ Reset form
            document.getElementById("addProductForm").reset();

            // ✅ Riporta il select alla categoria corrente
            document.getElementById("categoriaProdotto").value = categoria_id;

        } catch (error) {
            console.error("❌ Errore nell'aggiunta del prodotto:", error);
            alert("❌ Errore nell'aggiunta del prodotto. Controlla la console.");
        }
    });

    function setupVerificaPrezzi() {
        const verificaBtn = document.getElementById("verificaPrezziBtn");
        if (!verificaBtn) {
            console.warn("⚠️ Bottone verificaPrezziBtn non trovato.");
            return;
        }

        verificaBtn.addEventListener("click", async function () {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Devi essere autenticato per verificare i prezzi!");
                return;
            }

            const prodottiSelezionati = Array.from(document.querySelectorAll(".selezioneProdotto:checked")).map(input => ({
                id: input.dataset.id,
                url: input.dataset.url,
                selettore: input.dataset.selettore
            }));

            if (prodottiSelezionati.length === 0) {
                alert("Seleziona almeno un prodotto per il controllo!");
                return;
            }

            // 🔄 MOSTRA la progress bar
            const progressBar = document.getElementById("progressBar");
            const progressContainer = document.getElementById("progressContainer");
            let progress = 0;

            progressContainer.classList.remove("d-none");
            progressBar.style.width = "0%";
            progressBar.innerText = "0%";
            progressBar.classList.remove("bg-success");
            progressBar.classList.add("bg-info");

            // 🔄 Simula il caricamento progressivo
            const fakeProgress = setInterval(() => {
                if (progress < 95) {
                    progress++;
                    progressBar.style.width = `${progress}%`;
                    progressBar.innerText = `${progress}%`;
                }
            }, 100);

            document.getElementById("cardRisultati").classList.remove("d-none");
            document.getElementById("progressContainer").classList.remove("d-none");
            document.getElementById("progressBar").style.width = "0%";
            document.getElementById("progressBar").innerText = "0%";

            try {
                const response = await axios.post("https://monitoraggio-prezzi.onrender.com/api/check-prodotto",
                    { prodotti: prodottiSelezionati },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                clearInterval(fakeProgress);
                progressBar.style.width = "100%";
                progressBar.innerText = "Completato!";
                progressBar.classList.remove("bg-info");
                progressBar.classList.add("bg-success");

                const tableBody = document.getElementById("risultati-verifica");
                tableBody.innerHTML = "";

                const risultati = response.data?.risultati || [];
                risultati.forEach(prodotto => {
                    const nome = prodotto.nome_prodotto_trovato || "Nome non trovato";
                    const prezzoDatabase = parseFloat((prodotto.prezzo_database || "0").toString().replace(/[^0-9,.]/g, "").replace(",", ".")) || 0;
                    const nuovoPrezzo = parseFloat((prodotto.nuovo_prezzo || "0").toString().replace(/[^0-9,.]/g, "").replace(",", ".")) || 0;
                    const differenza = (nuovoPrezzo - prezzoDatabase).toFixed(2);
                    const differenzaColor = differenza > 0 ? "text-danger" : "text-success";

                    const row = `
          <tr>
             <td style="text-align: left;">${nome}</td>
              <td>${prezzoDatabase.toFixed(2)} €</td>
              <td>${nuovoPrezzo.toFixed(2)} €</td>
              <td class="${differenzaColor}">${differenza} €</td>
          </tr>
        `;
                    tableBody.innerHTML += row;
                });

                alert("✅ Verifica completata! Controlla la tabella dei risultati.");
            } catch (error) {
                clearInterval(fakeProgress);
                progressBar.classList.remove("bg-info");
                progressBar.classList.add("bg-danger");
                progressBar.style.width = "100%";
                progressBar.innerText = "Errore";

                console.error("❌ Errore durante il controllo dei prezzi:", error);
                alert("Errore durante il controllo dei prezzi.");
            }
        });
    }
    //Gestione categorie (Caricamento)
    async function caricaCategorieNelSelect() {
        const token = localStorage.getItem("token");
        if (!token) return;

        const select = document.getElementById("categoriaProdotto");

        if (!select) {
            console.warn("⚠️ select#categoriaProdotto NON trovato nel DOM");
            return;
        }

        console.log("✅ select#categoriaProdotto trovato, procedo a caricare le categorie...");

        try {
            const res = await axios.get("https://monitoraggio-prezzi.onrender.com/api/categorie", {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Pulisce e popola il select
            select.innerHTML = `<option value="">-- Seleziona Categoria --</option>`;
            res.data.forEach(cat => {
                const option = document.createElement("option");
                option.value = cat.id;
                option.textContent = cat.nome;
                select.appendChild(option);
            });

            console.log(`✅ ${res.data.length} categorie caricate.`);

            // ✅ Aggiungi event listener solo una volta
            if (!select.dataset.listenerAggiunto) {
                select.addEventListener("change", () => {
                    const categoriaId = select.value;
                    console.log("📌 Categoria selezionata:", categoriaId);

                    if (categoriaId) {
                        loadProducts(categoriaId); // ✅ filtra per categoria
                        caricaNomiPersonalizzati();
                    } else {
                        loadProducts(); // ✅ carica tutti
                    }
                });

                select.dataset.listenerAggiunto = "true"; // evita doppio listener
            }

        } catch (err) {
            console.error("❌ Errore durante il caricamento categorie:", err);
        }
    }


});