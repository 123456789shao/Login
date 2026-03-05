<template>
  <section class="panel admin-panel">
    <p class="tag">RESTRICTED AREA</p>
    <h1>Admin Center</h1>
    <p>
      This page is guarded by route meta permissions (<code>admin:access</code>). Users without this scope are
      redirected to <strong>/forbidden</strong>.
    </p>
    <ul>
      <li>Use this page to present route-level RBAC in your project demo.</li>
      <li>Pair it with API-level authorization in backend services.</li>
      <li>Keep front-end permissions as UX control, never as security boundary.</li>
    </ul>
  </section>
</template>

<style scoped>
.admin-panel {
  margin: 1rem auto;
  max-width: 760px;
  padding: 1.5rem;
}

.tag {
  color: #85a5cc;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.17em;
  margin: 0;
}

h1 {
  margin: 0.4rem 0 0.7rem;
}

ul {
  color: #c6d7ef;
  margin: 0.8rem 0 0;
  padding-left: 1.1rem;
}

li + li {
  margin-top: 0.45rem;
}

code {
  font-family: Consolas, 'Courier New', monospace;
}
</style>