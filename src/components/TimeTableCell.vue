<script setup lang="ts">

import {Ref} from "vue";

const props = defineProps<{
    parent: Ref<HTMLElement | null>;
    events: Ref<{id: string, name: string}[]>;
}>();

</script>

<template>
<ul :Ref="props.parent" class="flex flex-col space-y-4">
    <li v-for="event in events" :key="event.id" class="bg-white p-4 rounded shadow">
        {{ event.name }}
    </li>
</ul>
</template>

<style scoped>

</style>