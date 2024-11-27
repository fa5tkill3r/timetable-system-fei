import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {Subject} from "@/types.ts";

export const useStore = defineStore('store', () => {
    const subjects = ref<Subject[]>([])

    function addSubject(name: string, shortName: string, code: string, color: string) {
        subjects.value.push({ id: subjects.value.length + 1, name, shortName, code, color })
    }

    addSubject('Analýza a zložitosť algoritmov', 'AZA', 'B-AZA', '#FF0000')
    addSubject('Databázové systémy', 'DBS', 'B-DBS', '#00FF00')
    addSubject('Dátové štruktúry', 'DS', 'B-DS', '#0000FF')


    return { subjects }
})