// navigation-flow.machine.js
// FLOWPay Checkout — FSM minimal (XState-like) + copy binder
// ⚠️ Espera serviços globais (ou injetados): createPixCharge, submitCryptoTx, connectWallet, disconnectWallet

// ---------- tiny runtime
export function createMachine(config) { return config }
export function interpret(machine, opts = {}) {
  const svc = {
    state: { value: machine.initial, context: machine.context || {} },
    send: (type, payload) => transition(type, payload),
    subscribe: (fn) => (svc._sub = fn, () => (svc._sub = null)),
    _sub: null
  }
  function emit() { svc._sub && svc._sub(svc.state) }

  async function transition(type, payload) {
    const node = getNode(machine.states, svc.state.value)
    const def = node?.on?.[type]
    if (!def) return

    // target only (string), or object {target, guard, actions, invoke}
    const step = typeof def === "string" ? { target: def } : def

    // guard
    if (step.guard && !step.guard(svc.state.context, payload)) return

    // actions (before leaving)
    if (step.actions && Array.isArray(step.actions)) {
        step.actions.forEach(a => a(svc.state.context, payload))
    }

    // invoke async service
    if (step.invoke) {
      const { src, onDone, onError } = step.invoke
      try {
        const data = await src(svc.state.context, payload)
        if (onDone) {
          svc.state = { value: onDone, context: { ...svc.state.context, lastResult: data } }
          emit()
          return
        }
      } catch (err) {
        if (onError) {
          svc.state = { value: onError, context: { ...svc.state.context, lastError: err } }
          emit()
          return
        }
        throw err
      }
    }

    // target
    if (step.target) {
      svc.state = { value: step.target, context: svc.state.context }
      emit()
    }
  }

  function getNode(states, path) {
    const parts = path.split(".")
    let node = { states }
    for (const p of parts) node = node.states?.[p]
    return node
  }

  // boot
  setTimeout(emit, 0)
  return svc
}

// ---------- domain machine (routes / states)
export function makeCheckoutMachine(services, initialCopy) {
  // services: { createPix(ctx,payload), submitCrypto(ctx,payload), connect(), disconnect() }
  const copy = initialCopy || {}
  const ctx0 = { mode: null, walletConnected: false, copy }

  return createMachine({
    initial: "choose",
    context: ctx0,
    states: {
      // 1) escolher modo
      choose: {
        on: {
          SELECT_MODE: {
            guard: (_, p) => p?.mode === "pix" || p?.mode === "crypto",
            actions: (ctx, p) => ctx.mode = p.mode,
            target: "details"
          },
          CONNECT_WALLET: {
            invoke: { src: services.connect, onDone: "choose", onError: "error" },
            actions: (ctx) => ctx.walletConnected = true
          }
        }
      },

      // 2) preencher detalhes
      details: {
        on: {
          SUBMIT_PIX: {
            guard: (_, p) => Number(p?.valor) > 0 && p?.moeda && p?.wallet,
            invoke: { src: services.createPix, onDone: "confirm", onError: "error" }
          },
          SUBMIT_CRYPTO: {
            guard: (ctx, p) => ctx.walletConnected && Number(p?.amount) > 0 && p?.currency && p?.to,
            invoke: { src: services.submitCrypto, onDone: "confirm", onError: "error" }
          },
          CONNECT_WALLET: {
            invoke: { src: services.connect, onDone: "details", onError: "error" },
            actions: (ctx) => ctx.walletConnected = true
          }
        }
      },

      // 3) confirmação
      confirm: {
        on: {
          RESET: "choose",
          RETRY: "details"
        }
      },

      // erro
      error: {
        on: {
          RETRY: "details",
          RESET: "choose"
        }
      }
    }
  })
}

// ---------- UI binder: progress + visibility + copy
export function bindCheckoutUI(service, opts = {}) {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
  const stepsOrder = ["choose", "details", "confirm"]

  function applyProgress(state) {
    const idx = stepsOrder.indexOf(state.value)
    const pct = ((idx + 1) / stepsOrder.length) * 100
    const fill = $("#nf-fill"); if (fill) fill.style.width = `${pct}%`
    $$(".nf-dot").forEach((d, i) => {
      d.classList.toggle("is-active", i === idx)
      d.classList.toggle("is-done", i < idx)
    })
  }

  function applyVisibility(state) {
    $$(".flow-step").forEach(sec => {
      sec.hidden = sec.dataset.state !== state.value
    })
  }

  function applyCopy(state) {
    const routeCopy = service.state.context.copy?.routes?.["/checkout"] || {}
    const variant = routeCopy.active_variant || "A"
    const hero = (routeCopy.hero_options || []).find(h => h.id === variant)
    $("#hero-headline")    && ( $("#hero-headline").textContent    = hero?.headline    || "Checkout" )
    $("#hero-subheadline") && ( $("#hero-subheadline").textContent = hero?.subheadline || "" )

    // status footnote
    const foot = routeCopy.messages?.footnote || []
    $("#footnote") && ( $("#footnote").innerHTML = foot.map(li => `<li>${li}</li>`).join("") )
  }
  
  function applyBreadcrumb(state) {
    const stepsOrder = ["choose", "details", "confirm"]
    const currentStep = state.value
    const currentIndex = stepsOrder.indexOf(currentStep)
    
    // Atualizar breadcrumb visual
    $$(".breadcrumb-step").forEach((step, index) => {
      const stepName = step.dataset.step
      const stepIndex = stepsOrder.indexOf(stepName)
      
      step.classList.toggle("is-active", stepIndex === currentIndex)
      step.classList.toggle("is-done", stepIndex < currentIndex)
      step.classList.toggle("is-pending", stepIndex > currentIndex)
    })
  }

  // events wiring (data-action)
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]")
    if (!el) return
    const a = el.dataset.action
    if (a === "select-mode") {
      service.send("SELECT_MODE", { mode: el.dataset.mode })
    } else if (a === "connect-wallet") {
      service.send("CONNECT_WALLET")
    } else if (a === "retry") {
      service.send("RETRY")
    } else if (a === "reset") {
      service.send("RESET")
    }
  })

  // forms
  $("#pix-form")?.addEventListener("submit", (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    service.send("SUBMIT_PIX", {
      wallet: fd.get("wallet"),
      valor: Number(fd.get("valor")),
      moeda: fd.get("moeda"),
      id_transacao: fd.get("id_transacao") || `pix_${Date.now()}`
    })
  })

  $("#crypto-form")?.addEventListener("submit", (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    service.send("SUBMIT_CRYPTO", {
      amount: Number(fd.get("crypto-amount")),
      currency: fd.get("crypto-currency"),
      to: fd.get("crypto-to")
    })
  })

  // render on state change
  service.subscribe((state) => {
    applyProgress(state)
    applyVisibility(state)
    applyCopy(state)
    applyBreadcrumb(state)

    // toastish feedback (opcional)
    if (state.value === "confirm") opts.onToast?.("Pagamento confirmado. Registrando prova…", "success")
    if (state.value === "error")  opts.onToast?.("Falha ao processar. Tente novamente.", "error")
  })
}

// ---------- boot helper
export function startCheckout({ services, copy, onToast } = {}) {
  const machine = makeCheckoutMachine(services, copy)
  const svc = interpret(machine)
  bindCheckoutUI(svc, { onToast })
  return svc
}
