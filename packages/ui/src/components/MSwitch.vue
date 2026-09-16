<script setup lang="ts">
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    class="m-switch"
    :class="{ on: model }"
    type="button"
    role="switch"
    :aria-checked="model"
    @click="model = !model"
  />
</template>

<style scoped>
.m-switch {
  width: 40px;
  height: 23px;
  flex: 0 0 40px;
  border: 0;
  border-radius: 20px;
  background: var(--m-line);
  position: relative;
  cursor: pointer;
  transition: background .2s;
}
.m-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #fff;
  transition: left .2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
}
.m-switch.on { background: var(--m-accent); }
.m-switch.on::after { left: 19px; }
</style>
