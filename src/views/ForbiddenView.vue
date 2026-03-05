<template>
  <section class="panel state-card">
    <p class="state-code">403</p>
    <h1>Access Denied</h1>
    <p>You are authenticated, but your account does not have enough permissions for this route.</p>
    <RouterLink class="btn" to="/">Back to Dashboard</RouterLink>
  </section>
</template>

<style scoped>
.state-card {
  margin: 2.4rem auto;
  max-width: 560px;
  padding: 1.8rem;
  text-align: center;
}

.state-code {
  color: #f2b652;
  font-size: 2.6rem;
  font-weight: 800;
  margin: 0;
}

h1 {
  margin: 0.4rem 0 0.7rem;
}

p {
  color: #c7d8ef;
  margin: 0;
}

.btn {
  background: linear-gradient(135deg, #4bc2a6, #59d3ff);
  border-radius: 10px;
  color: #061522;
  display: inline-block;
  font-weight: 700;
  margin-top: 1rem;
  padding: 0.6rem 0.95rem;
}
</style>