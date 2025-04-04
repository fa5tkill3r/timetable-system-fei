<script setup lang="ts">
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
</script>

<template>
  <ResizablePanelGroup
    direction="horizontal"
    class="max-w rounded-lg border"
  >

    <ResizablePanel :default-size="50">
      <ResizablePanelGroup id="demo-group-2" direction="vertical">
        <ResizablePanel :default-size="80">
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Two</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel :default-size="20">
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Three</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel :default-size="10">
      <div class="flex h-[200px] items-center justify-center p-6">
        <span class="font-semibold">One</span>
      </div>
    </ResizablePanel>
    
  </ResizablePanelGroup>
</template>