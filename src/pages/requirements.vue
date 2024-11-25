<script setup lang="ts">
import {ref} from 'vue';
import {useDragAndDrop} from "@formkit/drag-and-drop/vue";
import DraggableList from '@/components/TimeTableCell.vue';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Button} from "@/components/ui/button";

const invoices = [
  {
    type: 'Predmet',
    createdAt: '01/01/2021',
    subject: 'Analýza a zložitosť algoritmov',
    paymentMethod: 'Credit Card',
  },
]
</script>

<template>
  <div class="container">
    <h1 class="text-2xl font-bold my-4">Požiadavky</h1>

    <Button class="mb-4 float-right mt-4">
      Vytvoriť požiadavku
    </Button>

    <Table>
      <TableCaption>Zoznam vaších požiadaviek.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead class="w-[100px]">
            Typ
          </TableHead>
          <TableHead>Predmet</TableHead>
          <TableHead>Vytvorené</TableHead>
          <TableHead class="text-right">
            Akcie
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="invoice in invoices" :key="invoice.invoice">
          <TableCell class="font-medium">
            {{ invoice.type }}
          </TableCell>
          <TableCell>{{ invoice.subject }}</TableCell>
          <TableCell>{{ invoice.createdAt }}</TableCell>
          <TableCell class="text-right">
<!--            {{ invoice.createdAt }}-->
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<style scoped>

</style>