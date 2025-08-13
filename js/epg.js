// Use appConfig for TV data URLs
const channelMap = window.appConfig.channelMap;
const tvXmlUrl = window.appConfig.tvXmlUrl;

// Electronic Program Guide (EPG) Implementation
class TVGuide {
    constructor() {
        // Map display channel/callsign to XML channel id
        this.channelMap = channelMap;
        this.channels = [];
        this.programs = [];
        this.currentTime = new Date();
        this.viewStartTime = new Date();
        this.timeSlotDuration = 30; // 30 minutes per slot
        this.totalSlots = 6; // 3 hours = 6 slots of 30 minutes (more horizontal)
        this.slotWidth = 350; // Wider slots for larger text
        this.channelWidth = 300; // Wider channel column
        this.init();
    }

    init() {
    this.setupEventListeners();
    this.loadTVData();
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 599993); // Update every (almost) 10 minutes
    setInterval(() => this.loadTVData(), 599993); // Update every (almost) 10 minutes
    }

    setupEventListeners() {
        $('#currentTime').on('click', () => {
            this.viewStartTime = new Date();
            this.renderEPG();
        });

        $('#prevTime').on('click', () => {
            this.viewStartTime.setHours(this.viewStartTime.getHours() - 3); // 3 hours instead of 2
            this.renderEPG();
        });

        $('#nextTime').on('click', () => {
            this.viewStartTime.setHours(this.viewStartTime.getHours() + 3); // 3 hours instead of 2
            this.renderEPG();
        });

        $('#refreshData').on('click', (e) => {
            e.preventDefault();
            this.loadTVData();
        });

        // Back to top button functionality
        $('#backToTop').on('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Show/hide back to top button based on scroll position
        $(window).on('scroll', () => {
            if ($(window).scrollTop() > 300) {
                $('#backToTop').fadeIn();
            } else {
                $('#backToTop').fadeOut();
            }
        });
    }

    updateCurrentTime() {
        this.currentTime = new Date();
        const timeStr = this.currentTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const shortTimeStr = this.currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        $('#currentTimeDisplay').text(timeStr);
        $('#navCurrentTime').text(`Current: ${shortTimeStr}`);
    }

    loadTVData() {
        // Use appConfig for TV XML URL and channelMap
        const tvXmlUrl = window.appConfig.tvXmlUrl;
        const channelMap = window.appConfig.channelMap;

        $.ajax({
            type: "GET",
            url: tvXmlUrl,
            dataType: "xml",
            success: (xml) => {
                this.parseXMLData(xml);
                this.adjustTimeForData();
                this.renderEPG();
            },
            error: (e) => {
                console.error("Error loading TV data:", e);
                $('#epgGrid').html('<div class="alert alert-danger">Error loading TV guide data from remote server. Please check your internet connection and that the XML file is available.</div>');
                if (typeof showWarning === 'function') {
                    showWarning('Unable to load TV guide data. Please check your connection or source server.');
                }
            }
        });
        return;
    }

    parseXMLData(xml) {
        // Reset arrays
        this.channels = [];
        this.programs = [];
        
        // Parse channels
        $(xml).find('channel').each((index, channelElement) => {
            const $channel = $(channelElement);
            const channelId = $channel.attr('id');
            const displayName = $channel.find('display-name').first().text();
            const shortName = $channel.find('display-name').eq(4).text() || displayName;
            const channelNumber = $channel.find('display-name').eq(2).text();
            const iconSrc = $channel.find('icon').attr('src');

            this.channels.push({
                id: channelId,
                displayName: displayName,
                shortName: shortName,
                channelNumber: channelNumber,
                iconSrc: iconSrc
            });
        });

        // Parse programs
        $(xml).find('programme').each((index, programElement) => {
            const $program = $(programElement);
            const startTime = this.parseXMLTime($program.attr('start'));
            const endTime = this.parseXMLTime($program.attr('stop'));
            const channelId = $program.attr('channel');
            const title = $program.find('title').text();
            const description = $program.find('desc').text();
            const category = $program.find('category').first().text();

            this.programs.push({
                channelId: channelId,
                startTime: startTime,
                endTime: endTime,
                title: title,
                description: description,
                category: category
            });
        });

        // Sort channels by channel number
        this.channels.sort((a, b) => {
            const aNum = parseFloat(a.channelNumber) || 999;
            const bNum = parseFloat(b.channelNumber) || 999;
            return aNum - bNum;
        });

        console.log(`Loaded ${this.channels.length} channels and ${this.programs.length} programs`);
        
        // Update channel count display
        $('#channelCount').text(`Showing ${this.channels.length} channels`);
        
        // Generate category legend
        this.generateCategoryLegend();
    }

    generateCategoryLegend() {
        // Collect all unique categories from programs
        const categories = [...new Set(this.programs.map(program => program.category).filter(cat => cat))];
        categories.sort();
        
        let legendHTML = '';
        categories.forEach(category => {
            const colors = this.getCategoryColor(category);
            legendHTML += `
                <div class="col-auto">
                    <span class="badge d-flex align-items-center" 
                          style="background: ${colors.background}; color: ${colors.text}; border: 1px solid ${colors.accent};">
                        <span class="category-color-dot me-1" 
                              style="width: 8px; height: 8px; background: ${colors.accent}; border-radius: 50%; display: inline-block;"></span>
                        ${category}
                    </span>
                </div>
            `;
        });
        
        $('#categoryLegendContent').html(legendHTML);
        
        console.log(`Found ${categories.length} unique program categories`);
    }

    adjustTimeForData() {
        // Since the XML data is current (August 4, 2025), we can use actual current time
        // But round to the nearest hour for better display
        this.viewStartTime = new Date();
        this.viewStartTime.setMinutes(0, 0, 0);
        
        // If there are programs, verify we have data for the current time period
        if (this.programs.length > 0) {
            const currentTime = new Date();
            const hasCurrentData = this.programs.some(program => {
                return program.startTime <= currentTime && program.endTime > currentTime;
            });
            
            // If no current data, start from the earliest available program time
            if (!hasCurrentData) {
                const earliestProgram = this.programs.reduce((earliest, program) => {
                    return (!earliest || program.startTime < earliest.startTime) ? program : earliest;
                });
                
                if (earliestProgram) {
                    this.viewStartTime = new Date(earliestProgram.startTime);
                    this.viewStartTime.setMinutes(0, 0, 0);
                }
            }
        }
    }

    parseXMLTime(xmlTimeStr) {
        // Parse format: "20250804010000 -0600" (with timezone)
        if (!xmlTimeStr) return null;
        const parts = xmlTimeStr.trim().split(' ');
        const timeStr = parts[0]; // "20250804010000"
        const timezone = parts[1]; // "-0600" or "+0000"
        const year = parseInt(timeStr.substring(0, 4));
        const month = parseInt(timeStr.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(timeStr.substring(6, 8));
        const hour = parseInt(timeStr.substring(8, 10));
        const minute = parseInt(timeStr.substring(10, 12));
        const second = parseInt(timeStr.substring(12, 14));

        // --- Old code (incorrect offset direction) ---
        /*
        // Create date and adjust for timezone if needed
        const date = new Date(year, month, day, hour, minute, second);
        // Handle timezone offset
        if (timezone) {
            const sign = timezone.charAt(0) === '+' ? 1 : -1;
            const offsetHours = parseInt(timezone.substring(1, 3));
            const offsetMinutes = parseInt(timezone.substring(3, 5));
            const totalOffsetMinutes = sign * (offsetHours * 60 + offsetMinutes);
            // Adjust for local timezone display
            date.setMinutes(date.getMinutes() + totalOffsetMinutes);
        }
        return date;
        */

        // --- New code: Parse as UTC, then convert to local time ---
        // Compose a string like '2025-08-04T01:00:00-06:00'
        let isoString = `${year.toString().padStart(4, '0')}-${(month+1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
        if (timezone && timezone.length === 5) {
            // Convert -0600 to -06:00
            isoString += timezone.substring(0,3) + ':' + timezone.substring(3,5);
        } else {
            isoString += 'Z'; // fallback to UTC
        }
        return new Date(isoString);
    }

    renderEPG() {
        this.renderTimeHeaders();
        this.renderSelectedChannelRows();
        this.addCurrentTimeMarker();

    }

    // Only render selected channels using the mapping
    renderSelectedChannelRows() {
        // Dynamically derive selectedChannels from appConfig.channelMap
        const channelMap = window.appConfig.channelMap;
        const selectedChannels = Object.entries(channelMap).map(([label, id]) => ({ label, id }));
        let gridHTML = '';
        selectedChannels.forEach(sel => {
            const channel = this.channels.find(c => c.id === sel.id);
            const [channelNumber, ...callsignParts] = sel.label.split(' ');
            const callsign = callsignParts.join(' ');
            if (channel) {
                channel.displayNumber = channelNumber;
                channel.displayCallsign = callsign;
                gridHTML += this.renderChannelRow(channel);
            } else {
                gridHTML += `<div class="epg-row d-flex" style="min-width: 100%;">
                    <div class="epg-channel flex-shrink-0" style="width: ${this.channelWidth}px;">
                        <div class="fw-bold channel-number" style="font-size:2.2em;line-height:1;">${channelNumber}</div>
                        <div class="channel-callsign" style="font-size:1em; color:#bbb;">${callsign}</div>
                    </div>
                    <div class="epg-programs-container d-flex flex-nowrap" style="width: ${this.totalSlots * this.slotWidth}px; min-width: ${this.totalSlots * this.slotWidth}px;">
                        <div class="epg-slot flex-shrink-0" style="width: 100%; color: #888;">No Data</div>
                    </div>
                </div>`;
            }
        });
        $('#epgGrid').html(gridHTML);
        this.initializeTooltips();
    }

    renderTimeHeaders() {
        const totalSlotsWidth = this.totalSlots * this.slotWidth;
        let headerHTML = `<div class="d-flex" style="min-width: 100%;">`;
        
        // Channel column header - fixed width to match channel info
        headerHTML += `<div class="epg-channel-header flex-shrink-0 p-3 fw-bold border-end bg-light" style="width: ${this.channelWidth}px;">
            <span class="channel-header-text">Channel</span>
        </div>`;
        
        // Time slots container
        headerHTML += `<div class="d-flex flex-nowrap" style="width: ${totalSlotsWidth}px; min-width: ${totalSlotsWidth}px;">`;
        
        for (let i = 0; i < this.totalSlots; i++) {
            const slotTime = new Date(this.viewStartTime);
            slotTime.setMinutes(slotTime.getMinutes() + (i * this.timeSlotDuration));
            
            const timeStr = slotTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            headerHTML += `<div class="time-slot flex-shrink-0 text-center fw-bold p-3 border-end bg-light" style="width: ${this.slotWidth}px;">
                <span class="time-header-text">${timeStr}</span>
            </div>`;
        }
        
        headerHTML += `</div>`; // Close time slots container
        headerHTML += `</div>`; // Close header
        
        $('#timeHeaders').html(headerHTML);
        
        // Update the current time display to show the viewing period
        const endTime = new Date(this.viewStartTime);
        endTime.setHours(endTime.getHours() + 3); // 3 hours instead of 2
        
        const periodStr = `${this.viewStartTime.toLocaleDateString()} ${this.viewStartTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })} - ${endTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })}`;
        
        $('#currentTimeDisplay').text(`Viewing: ${periodStr}`);
    }

    renderChannelRows() {
        // Show progress for large datasets
        if (this.channels.length > 50) {
            $('#epgGrid').html('<div class="text-center p-4"><div class="spinner-border" role="status"><span class="visually-hidden">Rendering...</span></div><p class="mt-2">Rendering all channels...</p></div>');
        }
        
        // Use setTimeout to allow UI to update before heavy rendering
        setTimeout(() => {
            let gridHTML = '';
            
            // Display all channels
            this.channels.forEach((channel, index) => {
                gridHTML += this.renderChannelRow(channel);
                
                // For very large datasets, provide progress feedback
                if (this.channels.length > 100 && index % 50 === 0) {
                    console.log(`Rendered ${index + 1} of ${this.channels.length} channels`);
                }
            });
            
            $('#epgGrid').html(gridHTML);
            
            // Initialize tooltips for the new content
            this.initializeTooltips();
            
            console.log(`Rendered ${this.channels.length} channels`);
        }, 100);
    }

    initializeTooltips() {
        // Clean up existing tooltips
        $('.tooltip').remove();
        
        // Initialize new tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl, {
                delay: { show: 500, hide: 100 }
            });
        });
    }

    renderChannelRow(channel) {
        const channelPrograms = this.getProgramsForChannel(channel.id);
        let rowHTML = `<div class="epg-row d-flex" data-channel-id="${channel.id}" style="min-width: 100%;">`;
        // Channel info column - fixed width
        rowHTML += `<div class="epg-channel flex-shrink-0" style="width: ${this.channelWidth}px;">`;
        if (channel.iconSrc) {
            rowHTML += `<img src="${channel.iconSrc}" class="channel-logo" alt="${channel.displayCallsign || channel.shortName}" onerror="this.style.display='none'" loading="lazy">`;
        }
        // Show channel number larger, callsign smaller underneath
        rowHTML += `<div>`;
        rowHTML += `<div class="fw-bold channel-number" style="font-size:4.2em;line-height:1;">${channel.displayNumber || channel.channelNumber}</div>`;
        rowHTML += `<div class="channel-callsign" style="font-size:1em; color:#bbb;">${channel.displayCallsign || channel.shortName}</div>`;
        rowHTML += `</div>`;
        rowHTML += `</div>`;

        // Programs container - flexible width with no wrapping
        const totalSlotsWidth = this.totalSlots * this.slotWidth;
        rowHTML += `<div class="epg-programs-container d-flex flex-nowrap" style="width: ${totalSlotsWidth}px; min-width: ${totalSlotsWidth}px;">`;
        
        // Generate merged program slots
        const mergedSlots = this.generateMergedSlots(channelPrograms);
        
        // Render merged slots
        mergedSlots.forEach(slot => {
            if (slot.program) {
                const slotWidth = slot.spanSlots * this.slotWidth;
                rowHTML += `<div class="epg-slot flex-shrink-0" style="width: ${slotWidth}px;">`;
                rowHTML += this.renderMergedProgram(slot.program, slot.spanSlots);
                rowHTML += `</div>`;
            } else {
                rowHTML += `<div class="epg-slot flex-shrink-0" style="width: ${this.slotWidth}px;">`;
                rowHTML += `<div class="epg-program no-program" style="background: #f8f9fa; color: #6c757d; border: 1px dashed #dee2e6; height: 100%;">
                    <div class="title">No Programming</div>
                </div>`;
                rowHTML += `</div>`;
            }
        });
        
        rowHTML += `</div>`; // Close programs container
        rowHTML += `</div>`; // Close row
        return rowHTML;
    }

    generateMergedSlots(channelPrograms) {
        const mergedSlots = [];
        let currentSlot = 0;
        
        while (currentSlot < this.totalSlots) {
            const slotStart = new Date(this.viewStartTime);
            slotStart.setMinutes(slotStart.getMinutes() + (currentSlot * this.timeSlotDuration));
            
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + this.timeSlotDuration);
            
            const program = this.findProgramInSlot(channelPrograms, slotStart, slotEnd);
            
            if (program) {
                // Calculate how many slots this program spans
                const spanSlots = this.calculateProgramSpan(program, currentSlot);
                
                mergedSlots.push({
                    program: program,
                    spanSlots: spanSlots,
                    startSlot: currentSlot
                });
                
                currentSlot += spanSlots;
            } else {
                mergedSlots.push({
                    program: null,
                    spanSlots: 1,
                    startSlot: currentSlot
                });
                currentSlot += 1;
            }
        }
        
        return mergedSlots;
    }

    calculateProgramSpan(program, startSlot) {
        let spanSlots = 1;
        const maxSlots = this.totalSlots - startSlot;
        
        for (let i = 1; i < maxSlots; i++) {
            const nextSlotStart = new Date(this.viewStartTime);
            nextSlotStart.setMinutes(nextSlotStart.getMinutes() + ((startSlot + i) * this.timeSlotDuration));
            
            const nextSlotEnd = new Date(nextSlotStart);
            nextSlotEnd.setMinutes(nextSlotEnd.getMinutes() + this.timeSlotDuration);
            
            // Check if the same program continues in the next slot
            if (program.startTime < nextSlotEnd && program.endTime > nextSlotStart) {
                spanSlots++;
            } else {
                break;
            }
        }
        
        return spanSlots;
    }

    renderMergedProgram(program, spanSlots) {
        // Check if this program is currently airing
        const isCurrentlyAiring = this.currentTime >= program.startTime && this.currentTime < program.endTime;
        const currentClass = isCurrentlyAiring ? 'current' : '';
        
        // Get category-based color
        const categoryColor = this.getCategoryColor(program.category);
        
        const startTimeStr = program.startTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        const endTimeStr = program.endTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        // Calculate duration for display
        const durationMinutes = (program.endTime - program.startTime) / (1000 * 60);
        const durationText = durationMinutes >= 60 ? 
            `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : 
            `${durationMinutes}m`;
        return `
            <div class="epg-program epg-program-merged ${currentClass}" 
                 title="${program.title} - ${program.description} (${durationText}) [${program.category}]"
                 data-bs-toggle="tooltip"
                 data-category="${program.category}"
                 style="width: 100%; background: ${categoryColor.background}; color: ${categoryColor.text}; border-left: 4px solid ${categoryColor.accent};">
                <div class="title">${program.title}</div>
            </div>
        `;        
/*         return `
            <div class="epg-program epg-program-merged ${currentClass}" 
                 title="${program.title} - ${program.description} (${durationText}) [${program.category}]"
                 data-bs-toggle="tooltip"
                 data-category="${program.category}"
                 style="width: 100%; background: ${categoryColor.background}; color: ${categoryColor.text}; border-left: 4px solid ${categoryColor.accent};">
                <div class="title">${program.title}</div>
                <div class="time">${startTimeStr} - ${endTimeStr}</div>
                <div class="description">${program.description}</div>
                <div class="duration small">${durationText}</div>
                <div class="category-badge">${program.category}</div>
            </div>
        `; */
    }

    getCategoryColor(category) {
        // Define color schemes for different program categories
        const categoryColors = {
            // Entertainment
            'Comedy': { background: '#634d06ff', text: '#ca9a0aff', accent: '#ffc107' },
            'Reality': { background: '#42292bff', text: '#be3240ff', accent: '#dc3545' },
            'Game Show': { background: '#284930ff', text: '#2cad4aff', accent: '#28a745' },
            'Talk': { background: '#132130ff', text: '#a1beddff', accent: '#007bff' },
            'Variety': { background: '#53555aff', text: '#aebdc9ff', accent: '#6c757d' },
            
            // Drama & Action
            'Drama': { background: '#2d1c3bff', text: '#b932bbff', accent: '#6f42c1' },
            'Crime drama': { background: '#2a3338ff', text: '#6b94c9ff', accent: '#6f42c1' },
            'Action': { background: '#50352eff', text: '#a0522d', accent: '#fd7e14' },
            'Adventure': { background: '#273d41ff', text: '#1ba0b8ff', accent: '#17a2b8' },
            'Thriller': { background: '#2c2c2c', text: '#ffffff', accent: '#343a40' },
            'Mystery': { background: '#343a40', text: '#ffffff', accent: '#495057' },
            
            // Documentary & Educational
            'Documentary': { background: '#254125ff', text: '#5cbb5cff', accent: '#198754' },
            'Educational': { background: '#1b2733ff', text: '#066ad6ff', accent: '#0d6efd' },
            'Science': { background: '#204a6eff', text: '#003d82', accent: '#0066cc' },
            'History': { background: '#575715ff', text: '#8b4513', accent: '#d2691e' },
            'Biography': { background: '#243d24ff', text: '#a9d45eff', accent: '#9acd32' },
            
            // News & Information
            'News': { background: '#490b0bff', text: '#ffffff', accent: '#886262ff' },
            'Weather': { background: '#3b82f6', text: '#ffffff', accent: '#1d4ed8' },
            'Business': { background: '#059669', text: '#ffffff', accent: '#047857' },
            'Politics': { background: '#7c3aed', text: '#ffffff', accent: '#5b21b6' },
            
            // Sports
            'Sports': { background: '#22c55e', text: '#ffffff', accent: '#16a34a' },
            'Football': { background: '#15803d', text: '#ffffff', accent: '#166534' },
            'Basketball': { background: '#ea580c', text: '#ffffff', accent: '#c2410c' },
            'Baseball': { background: '#1d4ed8', text: '#ffffff', accent: '#1e40af' },
            'Soccer': { background: '#059669', text: '#ffffff', accent: '#047857' },
            
            // Movies
            'Movie': { background: '#4c1d95', text: '#ffffff', accent: '#5b21b6' },
            'Horror': { background: '#991b1b', text: '#ffffff', accent: '#7f1d1d' },
            'Romance': { background: '#72224aff', text: '#ffffff', accent: '#db2777' },
            'Western': { background: '#a16207', text: '#ffffff', accent: '#92400e' },
            'Sci-Fi': { background: '#1e40af', text: '#ffffff', accent: '#1d4ed8' },
            
            // Children & Family
            'Children': { background: '#574a2bff', text: '#e06213ff', accent: '#f59e0b' },
            'Family': { background: '#124d37ff', text: '#0ed39bff', accent: '#10b981' },
            'Animation': { background: '#3b1026ff', text: '#d42a6eff', accent: '#ec4899' },
            'Cartoon': { background: '#271f3dff', text: '#702adaff', accent: '#8b5cf6' },
            
            // Music & Arts
            'Music': { background: '#3a2719ff', text: '#ffffff', accent: '#ea580c' },
            'Concert': { background: '#301006ff', text: '#ffffff', accent: '#9a3412' },
            'Arts': { background: '#054a5cff', text: '#ffffff', accent: '#0e7490' },
            'Cultural': { background: '#4d0925ff', text: '#ffffff', accent: '#a21caf' },
            
            // Lifestyle
            'Cooking': { background: '#4e0c0cff', text: '#ffffff', accent: '#b91c1c' },
            'Travel': { background: '#074e48ff', text: '#ffffff', accent: '#0f766e' },
            'Health': { background: '#073b1aff', text: '#ffffff', accent: '#15803d' },
            'Fashion': { background: '#481650ff', text: '#ffffff', accent: '#c026d3' },
            'Home': { background: '#0b204eff', text: '#ffffff', accent: '#1d4ed8' },
            
            // Special Categories
            'Shopping': { background: '#502506ff', text: '#ffffff', accent: '#ea580c' },
            'Paid Programming': { background: '#6b7280', text: '#ffffff', accent: '#4b5563' },
            'Religious': { background: '#7c3aed', text: '#ffffff', accent: '#6d28d9' },
            'Foreign': { background: '#0891b2', text: '#ffffff', accent: '#0e7490' },
            
            // TV Show Types
            'Series': { background: '#3730a3', text: '#ffffff', accent: '#4338ca' },
            'Mini-Series': { background: '#5b21b6', text: '#ffffff', accent: '#6d28d9' },
            'Special': { background: '#55081bff', text: '#ffffff', accent: '#e11d48' },
            'Premiere': { background: '#570e0eff', text: '#ffffff', accent: '#b91c1c' }
        };
        
        // Default color for unknown categories
        const defaultColor = { background: '#253c53ff', text: '#495057', accent: '#6c757d' };
        
        return categoryColors[category] || defaultColor;
    }

    getProgramsForChannel(channelId) {
        return this.programs.filter(program => program.channelId === channelId);
    }

    findProgramInSlot(channelPrograms, slotStart, slotEnd) {
        return channelPrograms.find(program => {
            return program.startTime < slotEnd && program.endTime > slotStart;
        });
    }

    addCurrentTimeMarker() {
        // Calculate position of current time marker
        const viewEnd = new Date(this.viewStartTime);
        viewEnd.setHours(viewEnd.getHours() + 3); // 3 hours instead of 2
        
        if (this.currentTime >= this.viewStartTime && this.currentTime <= viewEnd) {
            const totalMinutes = 3 * 60; // 3 hours in minutes
            const minutesFromStart = (this.currentTime - this.viewStartTime) / (1000 * 60);
            const percentage = minutesFromStart / totalMinutes;
            
            // Calculate position with fixed widths
            const totalSlotsWidth = this.totalSlots * this.slotWidth;
            const markerPosition = this.channelWidth + (percentage * totalSlotsWidth);
            
            const marker = `<div class="current-time-marker" style="left: ${markerPosition}px; height: 100%; position: absolute; top: 0;"></div>`;
            $('#epgGrid').css('position', 'relative').append(marker);
        }
    }
}

// Initialize EPG when document is ready
$(document).ready(function() {
    // Create EPG instance
    window.tvGuide = new TVGuide();
});

// Example AJAX/fetch usage for TV XML
function fetchTVXml() {
    fetch(window.appConfig.tvXmlUrl)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(xmlText => {
            // ...parse and use xmlText...
        })
        .catch(error => {
            if (typeof showWarning === 'function') {
                showWarning('Unable to load TV guide data. Please check your connection or source server.');
            }
            console.error('TV XML fetch error:', error);
        });
}
