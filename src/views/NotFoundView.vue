<template>
  <!-- 404 页面：未匹配到路由时展示。 -->
  <section class="panel state-card">
    <p class="state-code">404</p>
    <h1>Page Not Found</h1>
    <p>The page you requested does not exist in this auth module demo.</p>
    <RouterLink class="btn" to="/">Go Home</RouterLink>
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
  color: #59d3ff;
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
  background: transparent;
  border: 1px solid #355071;
  border-radius: 10px;
  color: #d6e5f9;
  display: inline-block;
  font-weight: 700;
  margin-top: 1rem;
  padding: 0.6rem 0.95rem;
}
</style>